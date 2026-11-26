import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateClientRequestDto {

    @IsOptional()
    @IsInt()
    id_client?: number;

    @IsNumber()
    @Min(0.01)
    fare_offered: number;

    @IsString()
    @MaxLength(255)
    pickup_description: string;

    @IsString()
    @MaxLength(255)
    destination_description: string;

    @IsNumber()
    @Min(-90)
    @Max(90)
    pickup_lat: number;

    @IsNumber()
    @Min(-180)
    @Max(180)
    pickup_lng: number;

    @IsNumber()
    @Min(-90)
    @Max(90)
    destination_lat: number;

    @IsNumber()
    @Min(-180)
    @Max(180)
    destination_lng: number;
}