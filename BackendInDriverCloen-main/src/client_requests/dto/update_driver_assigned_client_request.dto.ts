import { IsInt, IsNumber, Min } from 'class-validator';

export class UpdateDriverAssignedClientRequestDto {

    @IsInt()
    id: number;

    @IsInt()
    id_driver_assigned: number;

    @IsNumber()
    @Min(0.01)
    fare_assigned: number;

}