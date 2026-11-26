import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateUserDto {

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    lastname: string;
    @IsEmail()
    email: string;
    @IsString()
    @MaxLength(30)
    phone: string;
    @IsString()
    @MinLength(12)
    password: string;

    @IsOptional()
    @IsString()
    @MaxLength(2048)
    image?: string;
}