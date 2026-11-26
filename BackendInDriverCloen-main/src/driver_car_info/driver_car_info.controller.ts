import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { CreateDriverCarInfoDto } from './dto/create_driver_car_info.dto';
import { DriverCarInfoService } from './driver_car_info.service';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { JwtRolesGuard } from '../auth/jwt/jwt-roles.guard';
import { HasRoles } from '../auth/jwt/has-roles';
import { JwtRole } from '../auth/jwt/jwt-role';
import { AuthenticatedRequest } from '../auth/jwt/authenticated-request';

@Controller('driver-car-info')
@UseGuards(JwtAuthGuard, JwtRolesGuard)
export class DriverCarInfoController {

    constructor(private driverCarInfoService: DriverCarInfoService) {}

    @HasRoles(JwtRole.CLIENT, JwtRole.DRIVER)
    @Get(':id_driver')
    findByIdDriver(@Param('id_driver', ParseIntPipe) id_driver: number, @Req() request: AuthenticatedRequest) {
        return this.driverCarInfoService.findByIdDriver(id_driver, request.user.userId, request.user.roles);
    }

    @HasRoles(JwtRole.DRIVER)
    @Post()
    create(@Body() driverCarInfo: CreateDriverCarInfoDto, @Req() request: AuthenticatedRequest) {
        return this.driverCarInfoService.create(driverCarInfo, request.user.userId);
    }

}
