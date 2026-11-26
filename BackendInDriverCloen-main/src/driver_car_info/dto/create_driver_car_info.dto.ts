import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDriverCarInfoDto {

    @IsOptional()
    @IsInt()
    id_driver?: number;

    @IsString()
    @MaxLength(100)
    brand: string;

    @IsString()
    @MaxLength(20)
    plate: string;

    @IsString()
    @MaxLength(50)
    color: string;

}