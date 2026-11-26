import { IsString, IsEmail, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class RegisterAuthDto {
    
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    name: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    lastname: string;

    @IsNotEmpty()
    @IsString()
    @IsEmail({}, { message: 'El email no es valido' })
    @MaxLength(320)
    email: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(30)
    phone: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(12, { message: 'La contraseña debe tener minimo 12 caracteres' })
    @MaxLength(128)
    password: string;
}