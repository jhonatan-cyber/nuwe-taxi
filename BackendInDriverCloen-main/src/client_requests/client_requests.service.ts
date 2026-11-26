import { Client, TravelMode } from '@googlemaps/google-maps-services-js';
import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { TimeAndDistanceValuesService } from '../time_and_distance_values/time_and_distance_values.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientRequests, Status } from './client_requests.entity';
import { CreateClientRequestDto } from './dto/create_client_request.dto';
import { UpdateDriverAssignedClientRequestDto } from './dto/update_driver_assigned_client_request.dto';
import { UpdateStatusClientRequestDto } from './dto/update_status_client_request.dto';
import { UpdateDriverRatingDto } from './dto/update_driver_rating.dto';
import { UpdateClientRatingDto } from './dto/update_client_rating.dto';
import { FirebaseRepository } from '../firebase/firebase.repository';
import { ConfigService } from '@nestjs/config';
import { JwtRole } from '../auth/jwt/jwt-role';

@Injectable()
export class ClientRequestsService  extends Client {

    constructor(
        @InjectRepository(ClientRequests) private clientRequestsRepository: Repository<ClientRequests>,
        private timeAndDistanceValuesService: TimeAndDistanceValuesService,  
        private firebaseRepository: FirebaseRepository,
        private configService: ConfigService,
    ) {
        super();
    }
  
    async create(clientRequest: CreateClientRequestDto, clientId: number) {
        try {
            const inserted = await this.clientRequestsRepository.query(`
                INSERT INTO
                    client_requests(
                        id_client,
                        fare_offered,
                        pickup_description,
                        destination_description,
                        pickup_position,
                        destination_position
                    )
                VALUES(?, ?, ?, ?, ST_GeomFromText(?, 4326), ST_GeomFromText(?, 4326))
            `, [
                clientId,
                clientRequest.fare_offered,
                clientRequest.pickup_description,
                clientRequest.destination_description,
                `POINT(${clientRequest.pickup_lat} ${clientRequest.pickup_lng})`,
                `POINT(${clientRequest.destination_lat} ${clientRequest.destination_lng})`,
            ]);
            const requestId = Number(inserted.insertId);
            const nearbyDrivers = await this.clientRequestsRepository.query(`
            SELECT
                U.id,
                U.name,
                U.notification_token,
                DP.position,
                ST_Distance_Sphere(DP.position, ST_GeomFromText(?, 4326)) AS distance
            FROM
                users AS U
            LEFT JOIN
                drivers_position AS DP
            ON
                U.id = DP.id_driver    
            INNER JOIN
                user_has_roles AS UHR
            ON
                UHR.id_user = U.id
            INNER JOIN
                roles AS R
            ON
                R.id = UHR.id_rol
            WHERE
                R.id = ?
            HAVING
                distance < ?
            `, [
                `POINT(${clientRequest.pickup_lat} ${clientRequest.pickup_lng})`,
                JwtRole.DRIVER,
                10000,
            ]);
            const notificationTokens = [...new Set<string>(
                (nearbyDrivers as Array<{ notification_token?: unknown }>)
                    .map((driver) => driver.notification_token)
                    .filter((token): token is string => typeof token === 'string' && token.length > 0),
            )];

            if (notificationTokens.length > 0) {
              void this.firebaseRepository.sendMessageToMultipleDevices({
                "tokens": notificationTokens,
                "notification":{
                  "title":"Solicitud de viaje",
                  "body": clientRequest.pickup_description
                },
                "data" : {
                  "id_client_requets" : `${requestId}`,
                  "type" : 'CLIENT_REQUEST',
                },
                "android":{
                  "priority":"high",
                  "ttl": 180
                },
                "apns":{
                  "headers":{
                    "apns-priority":"5",
                    "apns-expiration":"180"
                  }
                }
              });
            }
            return requestId;
        } catch (error) {
            throw new HttpException('Error del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async updateDriverAssigned(driverAssigned: UpdateDriverAssignedClientRequestDto, clientId: number) {
        try {
            const result = await this.clientRequestsRepository.query(`
                UPDATE
                    client_requests
                SET
                    id_driver_assigned = ?,
                    status = ?,
                    updated_at = NOW(),
                    fare_assigned = ?
                WHERE
                    id = ?
                    AND id_client = ?
                    AND status = ?
                    AND EXISTS (
                        SELECT 1 FROM driver_trip_offers AS DTO
                        WHERE DTO.id_client_request = ?
                          AND DTO.id_driver = ?
                          AND DTO.fare_offered = ?
                    )
            `, [
                driverAssigned.id_driver_assigned,
                Status.ACCEPTED,
                driverAssigned.fare_assigned,
                driverAssigned.id,
                clientId,
                Status.CREATED,
                driverAssigned.id,
                driverAssigned.id_driver_assigned,
                driverAssigned.fare_assigned,
            ]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new HttpException('Error del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async updateStatus(updateStatusDto: UpdateStatusClientRequestDto, userId: number, roles: JwtRole[]) {
        try {
            const isDriver = roles.includes(JwtRole.DRIVER);
            const isClient = !isDriver && roles.includes(JwtRole.CLIENT);
            const allowedPreviousStatus = {
                [Status.ON_THE_WAY]: Status.ACCEPTED,
                [Status.ARRIVED]: Status.ON_THE_WAY,
                [Status.TRAVELLING]: Status.ARRIVED,
                [Status.FINISHED]: Status.TRAVELLING,
            };
            if (isClient && updateStatusDto.status !== Status.CANCELLED) {
                throw new HttpException('Estado no permitido para el cliente', HttpStatus.FORBIDDEN);
            }
            const previousStatus = allowedPreviousStatus[updateStatusDto.status as keyof typeof allowedPreviousStatus];
            if (!isClient && !previousStatus) {
                throw new HttpException('Estado no permitido para el conductor', HttpStatus.FORBIDDEN);
            }

            const result = isClient
                ? await this.clientRequestsRepository.query(`
                UPDATE
                    client_requests
                SET
                    status = ?,
                    updated_at = NOW()
                WHERE
                    id = ? AND id_client = ? AND status IN (?, ?)
            `, [updateStatusDto.status, updateStatusDto.id_client_request, userId, Status.CREATED, Status.ACCEPTED])
                : await this.clientRequestsRepository.query(`
                UPDATE client_requests
                SET status = ?, updated_at = NOW()
                WHERE id = ? AND id_driver_assigned = ? AND status = ?
            `, [updateStatusDto.status, updateStatusDto.id_client_request, userId, previousStatus]);
            return result.affectedRows > 0;
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new HttpException('Error del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async updateDriverRating(driverRating: UpdateDriverRatingDto, clientId: number) {
        try {
            const result = await this.clientRequestsRepository.query(`
                UPDATE
                    client_requests
                SET
                    driver_rating = ?,
                    updated_at = NOW()
                WHERE
                    id = ? AND id_client = ? AND status = ? AND driver_rating IS NULL
            `, [driverRating.driver_rating, driverRating.id_client_request, clientId, Status.FINISHED]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new HttpException('Error del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async updateClientRating(driverRating: UpdateClientRatingDto, driverId: number) {
        try {
            const result = await this.clientRequestsRepository.query(`
                UPDATE
                    client_requests
                SET
                    client_rating = ?,
                    updated_at = NOW()
                WHERE
                    id = ? AND id_driver_assigned = ? AND status = ? AND client_rating IS NULL
            `, [driverRating.client_rating, driverRating.id_client_request, driverId, Status.FINISHED]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new HttpException('Error del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getByClientRequest(id_client_request: number, userId: number) {
        const data = await this.clientRequestsRepository.query(`
        SELECT
            CR.id,
            CR.id_client,
            CR.fare_offered,
            CR.pickup_description,
            CR.destination_description,
            CR.status,
            CR.updated_at,
            CR.pickup_position,
            CR.destination_position,
            CR.fare_assigned,
            CR.id_driver_assigned,
            JSON_OBJECT(
                "name", U.name,
                "lastname", U.lastname,
                "phone", U.phone,
                "image", U.image
            ) AS client,
            JSON_OBJECT(
                "name", D.name,
                "lastname", D.lastname,
                "phone", D.phone,
                "image", D.image
            ) AS driver,
            JSON_OBJECT(
                "brand", DCI.brand,
                "plate", DCI.plate,
                "color", DCI.color
            ) AS car
        FROM 
            client_requests AS CR
        INNER JOIN
            users AS U
        ON
            U.id = CR.id_client
        LEFT JOIN
            users AS D
        ON
            D.id = CR.id_driver_assigned
        LEFT JOIN
            driver_car_info AS DCI
        ON
            DCI.id_driver = CR.id_driver_assigned
        WHERE
            CR.id = ? AND CR.status = ? AND (CR.id_client = ? OR CR.id_driver_assigned = ?)
        `, [id_client_request, Status.ACCEPTED, userId, userId]);
        if (data.length === 0) throw new NotFoundException('Solicitud no encontrada');
        return {
            ...data[0],
            'pickup_lat': data[0].pickup_position.y,
            'pickup_lng': data[0].pickup_position.x,
            'destination_lat': data[0].destination_position.y,
            'destination_lng': data[0].destination_position.x,
        };
    }

    async getByDriverAssigned(id_driver: number) {
        const data = await this.clientRequestsRepository.query(`
        SELECT
            CR.id,
            CR.id_client,
            CR.fare_offered,
            CR.pickup_description,
            CR.destination_description,
            CR.status,
            CR.updated_at,
            CR.created_at,
            CR.pickup_position,
            CR.destination_position,
            CR.fare_assigned,
            CR.id_driver_assigned,
            CR.driver_rating,
            CR.client_rating,
            JSON_OBJECT(
                "name", U.name,
                "lastname", U.lastname,
                "phone", U.phone,
                "image", U.image
            ) AS client,
            JSON_OBJECT(
                "name", D.name,
                "lastname", D.lastname,
                "phone", D.phone,
                "image", D.image
            ) AS driver,
            JSON_OBJECT(
                "brand", DCI.brand,
                "plate", DCI.plate,
                "color", DCI.color
            ) AS car
        FROM 
            client_requests AS CR
        INNER JOIN
            users AS U
        ON
            U.id = CR.id_client
        LEFT JOIN
            users AS D
        ON
            D.id = CR.id_driver_assigned
        LEFT JOIN
            driver_car_info AS DCI
        ON
            DCI.id_driver = CR.id_driver_assigned
        WHERE
            CR.id_driver_assigned = ? AND CR.status = ?
        `, [id_driver, Status.FINISHED]);
        return data;
    }

    async getByClientAssigned(id_client: number) {
        const data = await this.clientRequestsRepository.query(`
        SELECT
            CR.id,
            CR.id_client,
            CR.fare_offered,
            CR.pickup_description,
            CR.destination_description,
            CR.status,
            CR.updated_at,
            CR.created_at,
            CR.pickup_position,
            CR.destination_position,
            CR.fare_assigned,
            CR.id_driver_assigned,
            CR.driver_rating,
            CR.client_rating,
            JSON_OBJECT(
                "name", U.name,
                "lastname", U.lastname,
                "phone", U.phone,
                "image", U.image
            ) AS client,
            JSON_OBJECT(
                "name", D.name,
                "lastname", D.lastname,
                "phone", D.phone,
                "image", D.image
            ) AS driver,
            JSON_OBJECT(
                "brand", DCI.brand,
                "plate", DCI.plate,
                "color", DCI.color
            ) AS car
        FROM 
            client_requests AS CR
        INNER JOIN
            users AS U
        ON
            U.id = CR.id_client
        LEFT JOIN
            users AS D
        ON
            D.id = CR.id_driver_assigned
        LEFT JOIN
            driver_car_info AS DCI
        ON
            DCI.id_driver = CR.id_driver_assigned
        WHERE
            CR.id_client = ? AND CR.status = ?
        `, [id_client, Status.FINISHED]);
        return data;
    }

    async getNearbyTripRequest(driverId: number) {
        const data = await this.clientRequestsRepository.query(`
        SELECT
            CR.id,
            CR.id_client,
            CR.fare_offered,
            CR.pickup_description,
            CR.destination_description,
            CR.status,
            CR.updated_at,
            CR.pickup_position,
            CR.destination_position,
            DP.position AS driver_position,
            ST_Distance_Sphere(CR.pickup_position, DP.position) AS distance,
            timestampdiff(MINUTE, CR.updated_at, NOW()) AS time_difference,
        JSON_OBJECT(
            "name", U.name,
            "lastname", U.lastname,
            "image", U.image
        ) AS client
        FROM 
            client_requests AS CR
        INNER JOIN
            users AS U
        ON
            U.id = CR.id_client
        INNER JOIN
            drivers_position AS DP
        ON
            DP.id_driver = ?
        WHERE
            timestampdiff(MINUTE, CR.updated_at, NOW()) < ? AND CR.status = ?
        HAVING
            distance < ?
        `, [driverId, 5000, Status.CREATED, 10000]);
        if(data.length > 0) {
            const pickup_positions = data.map(d => ({ 
                lat: d.pickup_position.y, 
                lng: d.pickup_position.x 
            }));
    
            const driverPosition = data[0].driver_position;
            const googleResponse = await this.distancematrix({
                params: {
                    mode: TravelMode.driving,
                    key: this.configService.getOrThrow<string>('GOOGLE_MAPS_API_KEY'),
                    origins: [
                        {
                            lat: driverPosition.y,
                            lng: driverPosition.x
                        }
                    ],
                    destinations: pickup_positions
                }
            });
    
            data.forEach((d, index) => {
                d.google_distance_matrix = googleResponse.data.rows[0].elements[index];
            });      
        }
        return data;
    }

    async getTimeAndDistanceClientRequest(
        origin_lat: number,
        origin_lng: number,
        destination_lat: number,
        destination_lng: number,
    ) {

        this.assertCoordinates(origin_lat, origin_lng);
        this.assertCoordinates(destination_lat, destination_lng);

        const values = await this.timeAndDistanceValuesService.find();
        const kmValue = values[0].km_value;
        const minValue = values[0].min_value;

        const googleResponse = await this.distancematrix({
            params: {
                mode: TravelMode.driving,
                key: this.configService.getOrThrow<string>('GOOGLE_MAPS_API_KEY'),
                origins: [
                    {
                        lat: origin_lat,
                        lng: origin_lng
                    }
                ],
                destinations: [
                    {
                        lat: destination_lat,
                        lng: destination_lng
                    }
                ]
            }
        });
        
        const recommendedValue = (kmValue * (googleResponse.data.rows[0].elements[0].distance.value / 1000)) + (minValue * (googleResponse.data.rows[0].elements[0].duration.value / 60))

        return {
            'recommended_value': recommendedValue,
            'destination_addresses': googleResponse.data.destination_addresses[0],
            'origin_addresses': googleResponse.data.origin_addresses[0],
            'distance': {
                'text': googleResponse.data.rows[0].elements[0].distance.text,
                'value': (googleResponse.data.rows[0].elements[0].distance.value / 1000)
            },
            'duration': {
                'text': googleResponse.data.rows[0].elements[0].duration.text,
                'value': (googleResponse.data.rows[0].elements[0].duration.value / 60)
            },
        };
    }

    private assertCoordinates(latitude: number, longitude: number) {
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
            || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new BadRequestException('Coordenadas no válidas');
        }
    }


}
