import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { DriverTripOffersService } from './driver_trip_offers.service';
import { CreateDriverTripOffersDto } from './dto/create_driver_trip_offers.dto';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { JwtRolesGuard } from '../auth/jwt/jwt-roles.guard';
import { HasRoles } from '../auth/jwt/has-roles';
import { JwtRole } from '../auth/jwt/jwt-role';
import { AuthenticatedRequest } from '../auth/jwt/authenticated-request';

@Controller('driver-trip-offers')
@UseGuards(JwtAuthGuard, JwtRolesGuard)
export class DriverTripOffersController {

    constructor(private driverTripOffersService: DriverTripOffersService) {}

    @HasRoles(JwtRole.CLIENT)
    @Get('findByClientRequest/:id_client_request')
    findByClientRequest(@Param('id_client_request', ParseIntPipe) id_client_request: number, @Req() request: AuthenticatedRequest) {
        return this.driverTripOffersService.findByClientRequest(id_client_request, request.user.userId);
    }

    @HasRoles(JwtRole.DRIVER)
    @Post()
    create(@Body() driverTripOffer: CreateDriverTripOffersDto, @Req() request: AuthenticatedRequest) {
        return this.driverTripOffersService.create(driverTripOffer, request.user.userId);
    }

}
