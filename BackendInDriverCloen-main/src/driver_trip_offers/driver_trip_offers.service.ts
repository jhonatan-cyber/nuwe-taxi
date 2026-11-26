import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DriverTripOffers } from './driver_trip_offers.entity';
import { Repository } from 'typeorm';
import { CreateDriverTripOffersDto } from './dto/create_driver_trip_offers.dto';

@Injectable()
export class DriverTripOffersService {

    constructor(@InjectRepository(DriverTripOffers) private driverTripOffersRepository: Repository<DriverTripOffers>) {}

    async create(driverTripOffer: CreateDriverTripOffersDto, driverId: number) {
        const [request] = await this.driverTripOffersRepository.query(
            'SELECT id, id_client FROM client_requests WHERE id = ? AND status = ?',
            [driverTripOffer.id_client_request, 'CREATED'],
        );
        if (!request) throw new NotFoundException('Solicitud no disponible');
        if (request.id_client === driverId) throw new ForbiddenException();

        const existingOffer = await this.driverTripOffersRepository.findOneBy({
            id_client_request: driverTripOffer.id_client_request,
            id_driver: driverId,
        });
        const offer = existingOffer
            ? Object.assign(existingOffer, driverTripOffer, { id_driver: driverId })
            : this.driverTripOffersRepository.create({ ...driverTripOffer, id_driver: driverId });
        return this.driverTripOffersRepository.save(offer);
    }

    async findByClientRequest(id_client_request: number, clientId: number) {
        const data = await this.driverTripOffersRepository.query(`
        SELECT
            DTO.id,
            DTO.id_client_request,
            DTO.id_driver,
            DTO.fare_offered,
            DTO.time,
            DTO.distance,
            DTO.updated_at,
            DTO.created_at,
            JSON_OBJECT(
                "name", U.name,
                "lastname", U.lastname,
                "image", U.image
            ) AS driver,
            JSON_OBJECT(
                "brand", DCI.brand,
                "plate", DCI.plate,
                "color", DCI.color
            ) AS car
        FROM
            driver_trip_offers AS DTO
        INNER JOIN
            users AS U
        ON
            U.id = DTO.id_driver
        LEFT JOIN 
            driver_car_info AS DCI
        ON
            DCI.id_driver = DTO.id_driver
        WHERE
            DTO.id_client_request = ?
            AND EXISTS (
                SELECT 1 FROM client_requests AS CR
                WHERE CR.id = DTO.id_client_request AND CR.id_client = ?
            )

        `, [id_client_request, clientId]);
        return data;
    }

}
