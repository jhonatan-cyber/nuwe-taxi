import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DriverCarInfo } from './driver_car_info.entity';
import { Repository } from 'typeorm';
import {  CreateDriverCarInfoDto } from './dto/create_driver_car_info.dto';
import { JwtRole } from '../auth/jwt/jwt-role';
import { Status } from '../client_requests/client_requests.entity';

@Injectable()
export class DriverCarInfoService {

    constructor(@InjectRepository(DriverCarInfo) private driverCarInfoRepository: Repository<DriverCarInfo>) {}

    async create(driverCarInfo: CreateDriverCarInfoDto, driverId: number) {
        const carInfoFound = await this.driverCarInfoRepository.findOneBy({ id_driver: driverId });
        if (!carInfoFound) {
            const newCarInfo = this.driverCarInfoRepository.create({ ...driverCarInfo, id_driver: driverId });
            return this.driverCarInfoRepository.save(newCarInfo);
        }
        const updatedCarInfo = Object.assign(carInfoFound, driverCarInfo, { id_driver: driverId });
        return this.driverCarInfoRepository.save(updatedCarInfo);
    }

    async findByIdDriver(id_driver: number, requesterId: number, roles: JwtRole[]) {
        if (!(roles.includes(JwtRole.DRIVER) && requesterId === id_driver)) {
            const [request] = await this.driverCarInfoRepository.query(`
                SELECT id FROM client_requests
                WHERE id_client = ? AND id_driver_assigned = ? AND status IN (?, ?, ?, ?)
                LIMIT 1
            `, [requesterId, id_driver, Status.ACCEPTED, Status.ON_THE_WAY, Status.ARRIVED, Status.TRAVELLING]);
            if (!request) throw new ForbiddenException();
        }
        const car = await this.driverCarInfoRepository.findOneBy({ id_driver });
        if (!car) throw new NotFoundException('Vehículo no disponible');
        return car;
    }

}
