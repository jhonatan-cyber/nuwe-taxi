import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Repository } from 'typeorm';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { compare } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Rol } from '../roles/rol.entity';
import { JwtRole } from './jwt/jwt-role';


@Injectable()
export class AuthService {

    constructor(
        @InjectRepository(User) private usersRepository: Repository<User>,
        @InjectRepository(Rol) private rolesRepository: Repository<Rol>,

        private jwtService: JwtService
    ) {}

    async register(user: RegisterAuthDto) {
        const { email, phone } = user;
        const emailExist = await this.usersRepository.findOneBy({ email });

        if (emailExist) {
            // 409 CONFLICT
            throw new HttpException('El email ya esta registrado', HttpStatus.CONFLICT);
        }

        const phoneExist = await this.usersRepository.findOneBy({ phone });

        if (phoneExist) {
            throw new HttpException('El telefono ya esta registrado', HttpStatus.CONFLICT)
        }

        const clientRole = await this.rolesRepository.findOneBy({ id: JwtRole.CLIENT });
        if (!clientRole) {
            throw new HttpException('El rol CLIENT no está configurado', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const newUser = this.usersRepository.create({
            name: user.name,
            lastname: user.lastname,
            email: user.email,
            phone: user.phone,
            password: user.password,
            roles: [clientRole],
        });

        const userSaved = await this.usersRepository.save(newUser);

        const rolesString = userSaved.roles.map((rol) => rol.id);
        const payload = { id: userSaved.id, name: userSaved.name, roles: rolesString };
        const token = this.jwtService.sign(payload);
        return { user: this.toPublicUser(userSaved), token: `Bearer ${token}` };
    }

    async login(loginData: LoginAuthDto) {

        const { email, password } = loginData;
        const userFound = await this.usersRepository.createQueryBuilder('user')
            .addSelect('user.password')
            .leftJoinAndSelect('user.roles', 'roles')
            .where('user.email = :email', { email })
            .getOne();
        if (!userFound) {
            throw new UnauthorizedException('Credenciales incorrectas');
        }
        
        const isPasswordValid = await compare(password, userFound.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Credenciales incorrectas');
        }

        const rolesIds = userFound.roles.map(rol => rol.id); //['CLIENT', 'ADMIN']

        const payload = { 
            id: userFound.id, 
            name: userFound.name, 
            roles: rolesIds 
        };
        const token = this.jwtService.sign(payload);
        return { user: this.toPublicUser(userFound), token: `Bearer ${token}` };
    }

    private toPublicUser(user: User) {
        return {
            id: user.id,
            name: user.name,
            lastname: user.lastname,
            email: user.email,
            phone: user.phone,
            image: user.image,
            roles: (user.roles ?? []).map(({ id, name, image, route }) => ({ id, name, image, route })),
        };
    }

}
