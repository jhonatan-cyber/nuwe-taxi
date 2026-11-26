import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateDriverTripOffersDto {

    @IsOptional()
    @IsInt()
    id_driver?: number;

    @IsNumber()
    @Min(0.01)
    fare_offered: number;

    @IsNumber()
    @Min(0)
    time: number;

    @IsNumber()
    @Min(0)
    distance: number;

    @IsInt()
    id_client_request: number;
    

}