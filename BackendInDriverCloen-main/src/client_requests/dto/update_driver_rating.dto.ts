import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class UpdateDriverRatingDto {

    @IsInt()
    id_client_request: number;

    @IsNumber()
    @Min(1)
    @Max(5)
    driver_rating: number;

}