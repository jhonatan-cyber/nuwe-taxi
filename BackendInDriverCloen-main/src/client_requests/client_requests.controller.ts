import { Body, Controller, Get, Param, ParseFloatPipe, ParseIntPipe, Post, Put, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { ClientRequestsService } from './client_requests.service';
import { CreateClientRequestDto } from './dto/create_client_request.dto';
import { UpdateDriverAssignedClientRequestDto } from './dto/update_driver_assigned_client_request.dto';
import { UpdateStatusClientRequestDto } from './dto/update_status_client_request.dto';
import { UpdateDriverRatingDto } from './dto/update_driver_rating.dto';
import { UpdateClientRatingDto } from './dto/update_client_rating.dto';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { JwtRolesGuard } from '../auth/jwt/jwt-roles.guard';
import { HasRoles } from '../auth/jwt/has-roles';
import { JwtRole } from '../auth/jwt/jwt-role';
import { AuthenticatedRequest } from '../auth/jwt/authenticated-request';

@Controller('client-requests')
@UseGuards(JwtAuthGuard, JwtRolesGuard)
export class ClientRequestsController {

    constructor(private clientRequestsService: ClientRequestsService) {}

    @HasRoles(JwtRole.CLIENT)
    @Get(':origin_lat/:origin_lng/:destination_lat/:destination_lng')
    getTimeAndDistanceClientRequest(
        @Param('origin_lat', ParseFloatPipe) origin_lat: number,
        @Param('origin_lng', ParseFloatPipe) origin_lng: number,
        @Param('destination_lat', ParseFloatPipe) destination_lat: number,
        @Param('destination_lng', ParseFloatPipe) destination_lng: number,
    ) {
        return this.clientRequestsService.getTimeAndDistanceClientRequest(
            origin_lat,
            origin_lng,
            destination_lat,
            destination_lng
        )
    }

    @HasRoles(JwtRole.DRIVER)
    @Get('nearby')
    getNearbyTripRequest(@Req() request: AuthenticatedRequest) {
        return this.clientRequestsService.getNearbyTripRequest(request.user.userId);
    }

    @HasRoles(JwtRole.CLIENT, JwtRole.DRIVER)
    @Get(':id_client_request')
    getByClientRequest(
        @Param('id_client_request', ParseIntPipe) id_client_request: number,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.clientRequestsService.getByClientRequest(id_client_request, request.user.userId);
    }

    @HasRoles(JwtRole.DRIVER)
    @Get('driver/assigned/:id_driver')
    getByDriverAssigned(
        @Param('id_driver', ParseIntPipe) id_driver: number,
        @Req() request: AuthenticatedRequest,
    ) {
        if (id_driver !== request.user.userId) throw new ForbiddenException();
        return this.clientRequestsService.getByDriverAssigned(request.user.userId);
    }

    @HasRoles(JwtRole.CLIENT)
    @Get('client/assigned/:id_client')
    getByClientAssigned(
        @Param('id_client', ParseIntPipe) id_client: number,
        @Req() request: AuthenticatedRequest,
    ) {
        if (id_client !== request.user.userId) throw new ForbiddenException();
        return this.clientRequestsService.getByClientAssigned(request.user.userId);
    }

    @HasRoles(JwtRole.CLIENT)
    @Post()
    create(@Body() clientRequest: CreateClientRequestDto, @Req() request: AuthenticatedRequest) {
        return this.clientRequestsService.create(clientRequest, request.user.userId);
    }

    @HasRoles(JwtRole.CLIENT)
    @Put()
    updateDriverAssigned(@Body() driverAssigned: UpdateDriverAssignedClientRequestDto, @Req() request: AuthenticatedRequest) {
        return this.clientRequestsService.updateDriverAssigned(driverAssigned, request.user.userId);
    }

    @HasRoles(JwtRole.CLIENT, JwtRole.DRIVER)
    @Put('update_status')
    updateStatus(@Body() updateStatusDto: UpdateStatusClientRequestDto, @Req() request: AuthenticatedRequest) {
        return this.clientRequestsService.updateStatus(updateStatusDto, request.user.userId, request.user.roles);
    }

    @HasRoles(JwtRole.CLIENT)
    @Put('update_driver_rating')
    updateDriverRating(@Body() driverRating: UpdateDriverRatingDto, @Req() request: AuthenticatedRequest) {
        return this.clientRequestsService.updateDriverRating(driverRating, request.user.userId);
    }


    @HasRoles(JwtRole.DRIVER)
    @Put('update_client_rating')
    updateClientRating(@Body() clientRating: UpdateClientRatingDto, @Req() request: AuthenticatedRequest) {
        return this.clientRequestsService.updateClientRating(clientRating, request.user.userId);
    }

}
