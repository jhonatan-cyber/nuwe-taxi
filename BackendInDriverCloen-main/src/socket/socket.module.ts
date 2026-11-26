import { Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientRequests } from '../client_requests/client_requests.entity';
import { DriverTripOffers } from '../driver_trip_offers/driver_trip_offers.entity';
import { DriversPosition } from '../drivers_position/drivers_position.entity';

@Module({
    imports: [AuthModule, TypeOrmModule.forFeature([ClientRequests, DriverTripOffers, DriversPosition])],
    providers: [SocketGateway],
})
export class SocketModule {}
