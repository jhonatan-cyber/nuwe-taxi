import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { SocketModule } from './socket/socket.module';
import { DriversPositionModule } from './drivers_position/drivers_position.module';
import { ClientRequestsModule } from './client_requests/client_requests.module';
import { TimeAndDistanceValuesModule } from './time_and_distance_values/time_and_distance_values.module';
import { DriverTripOffersModule } from './driver_trip_offers/driver_trip_offers.module';
import { DriverCarInfoModule } from './driver_car_info/driver_car_info.module';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from './firebase/firebase.module';
import { ConfigService } from '@nestjs/config';



@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const username = configService.getOrThrow<string>('DB_USERNAME');
        if (username.toLowerCase() === 'root') {
          throw new Error('Configure una cuenta PostgreSQL de privilegios mínimos en DB_USERNAME');
        }

        return {
          type: 'postgres' as const,
          host: configService.getOrThrow<string>('DB_HOST'),
          port: Number(configService.getOrThrow<string>('DB_PORT')),
          username,
          password: configService.getOrThrow<string>('DB_PASSWORD'),
          database: configService.getOrThrow<string>('DB_DATABASE'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: false,
          ssl: configService.get<string>('DB_SSL') === 'true'
            ? { rejectUnauthorized: true }
            : undefined,
        };
      },
    }),
    UsersModule,
    AuthModule,
    RolesModule,
    SocketModule,
    DriversPositionModule,
    ClientRequestsModule,
    TimeAndDistanceValuesModule,
    DriverTripOffersModule,
    DriverCarInfoModule,
    FirebaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
