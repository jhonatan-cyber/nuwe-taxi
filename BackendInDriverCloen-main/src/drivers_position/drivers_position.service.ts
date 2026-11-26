import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DriversPosition } from './drivers_position.entity';
import { Repository } from 'typeorm';
import { CreateDriverPositionDto } from './dto/create_driver_position.dto';
import { JwtRole } from '../auth/jwt/jwt-role';
import { Status } from '../client_requests/client_requests.entity';

@Injectable()
export class DriversPositionService {

    constructor(
        @InjectRepository(DriversPosition) private driversPositionRepository: Repository<DriversPosition>
    ) {}

    async create(driverPosition: CreateDriverPositionDto, driverId: number) {
        this.assertCoordinates(driverPosition.lat, driverPosition.lng);
        await this.driversPositionRepository.query(`
            INSERT INTO drivers_position (id_driver, position)
            VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography)
            ON CONFLICT (id_driver) DO UPDATE SET position = EXCLUDED.position
        `, [driverId, driverPosition.lng, driverPosition.lat]);
        return true;
    }

    async getDriverPosition(id_driver: number, requesterId: number, roles: JwtRole[]) {
        if (!(roles.includes(JwtRole.DRIVER) && requesterId === id_driver)) {
            const [request] = await this.driversPositionRepository.query(`
                SELECT id FROM client_requests
                WHERE id_client = $1 AND id_driver_assigned = $2 AND status IN ($3, $4, $5, $6)
                LIMIT 1
            `, [requesterId, id_driver, Status.ACCEPTED, Status.ON_THE_WAY, Status.ARRIVED, Status.TRAVELLING]);
            if (!request) throw new ForbiddenException();
        }
        const [driverPosition] = await this.driversPositionRepository.query(`
            SELECT id_driver, ST_Y(position::geometry) AS lat, ST_X(position::geometry) AS lng
            FROM drivers_position WHERE id_driver = $1
        `, [id_driver]);
        if (!driverPosition) throw new NotFoundException('Ubicación no disponible');
        return {
            id_driver: driverPosition.id_driver,
            lat: driverPosition.lat,
            lng: driverPosition.lng,
        };
    }

    async getNearbyDrivers(clientId: number) {
        const driversPosition = await this.driversPositionRepository.query(`
            SELECT
                CR.id_driver_assigned AS id_driver,
                ST_Y(DP.position::geometry) AS lat,
                ST_X(DP.position::geometry) AS lng
            FROM
                client_requests AS CR
            INNER JOIN drivers_position AS DP ON DP.id_driver = CR.id_driver_assigned
            WHERE CR.id_client = $1 AND CR.status IN ($2, $3, $4, $5)
        `, [clientId, Status.ACCEPTED, Status.ON_THE_WAY, Status.ARRIVED, Status.TRAVELLING]);
        return driversPosition;
    }

    delete(id_driver: number) {
        return this.driversPositionRepository.delete({ id_driver });
    }

    private assertCoordinates(latitude: number, longitude: number) {
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
            || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new BadRequestException('Coordenadas no válidas');
        }
    }

}
