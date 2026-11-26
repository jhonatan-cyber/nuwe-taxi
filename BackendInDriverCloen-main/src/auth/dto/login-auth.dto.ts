import { IsString, IsEmail, IsNotEmpty, MaxLength } from 'class-validator';
export class LoginAuthDto {

    @IsNotEmpty()
    @IsString()
    @IsEmail()
    @MaxLength(320)
    email: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(128)
    password: string;

}