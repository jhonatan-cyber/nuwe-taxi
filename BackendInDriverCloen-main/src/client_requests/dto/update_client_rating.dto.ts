import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class UpdateClientRatingDto {

    @IsInt()
    id_client_request: number;

    @IsNumber()
    @Min(1)
    @Max(5)
    client_rating: number;

}