import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseFloatPipe, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { CreateDriverPositionDto } from './dto/create_driver_position.dto';
import { DriversPositionService } from './drivers_position.service';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { JwtRolesGuard } from '../auth/jwt/jwt-roles.guard';
import { HasRoles } from '../auth/jwt/has-roles';
import { JwtRole } from '../auth/jwt/jwt-role';
import { AuthenticatedRequest } from '../auth/jwt/authenticated-request';

@Controller('drivers-position')
@UseGuards(JwtAuthGuard, JwtRolesGuard)
export class DriversPositionController {

    constructor(
        private driversPositionService: DriversPositionService
    ) {}

    @HasRoles(JwtRole.DRIVER)
    @Post()
    create(@Body() driversPosition: CreateDriverPositionDto, @Req() request: AuthenticatedRequest) {
        return this.driversPositionService.create(driversPosition, request.user.userId)
    }   

    @HasRoles(JwtRole.CLIENT, JwtRole.DRIVER)
    @Get(':id_driver')
    getDriverPosition(@Param('id_driver', ParseIntPipe) id_driver: number, @Req() request: AuthenticatedRequest) {
        return this.driversPositionService.getDriverPosition(id_driver, request.user.userId, request.user.roles);
    }

    @HasRoles(JwtRole.CLIENT)
    @Get(':client_lat/:client_lng')
    getNearbyDrivers(
        @Param('client_lat', ParseFloatPipe) _client_lat: number,
        @Param('client_lng', ParseFloatPipe) _client_lng: number,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.driversPositionService.getNearbyDrivers(request.user.userId);
    }

    @HasRoles(JwtRole.DRIVER)
    @Delete(':id_driver')
    delete(@Param('id_driver', ParseIntPipe) id_driver: number, @Req() request: AuthenticatedRequest) {
        if (id_driver !== request.user.userId) throw new ForbiddenException();
        return this.driversPositionService.delete(request.user.userId);
    }

}
