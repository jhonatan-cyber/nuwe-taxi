import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class CreateDriverPositionDto {

    @IsOptional()
    @IsInt()
    id_driver?: number;

    @IsNumber()
    @Min(-90)
    @Max(90)
    lat: number;

    @IsNumber()
    @Min(-180)
    @Max(180)
    lng: number;

}