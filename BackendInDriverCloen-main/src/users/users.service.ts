import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateNotificationTokenDto } from './dto/update-notification-token.dto';
import storage = require('../utils/cloud_storage');
import { randomUUID } from 'crypto';

@Injectable()
export class UsersService {

    constructor(
        @InjectRepository(User) private usersRepository: Repository<User>,
    ) {}
    
    async create(user: CreateUserDto) {
        const newUser = this.usersRepository.create(user);
        return this.toPublicUser(await this.usersRepository.save(newUser));
    }

    async findAll() {
        const users = await this.usersRepository.find({ relations: ['roles'] });
        return users.map((user) => this.toPublicUser(user));
    }

    async update(id: number, user: UpdateUserDto) {
        const userFound = await this.usersRepository.findOneBy({ id });

        if (!userFound) {
            throw new HttpException('Usuario no existe', HttpStatus.NOT_FOUND);
        }

        const updatedUser = Object.assign(userFound, user);
        return this.toPublicUser(await this.usersRepository.save(updatedUser));
    }

    async updateNotificationToken(id: number, user: UpdateNotificationTokenDto) {
        const userFound = await this.usersRepository.findOneBy({ id });
        if (!userFound) {
            throw new HttpException('Usuario no existe', HttpStatus.NOT_FOUND);
        }
        userFound.notification_token = user.notification_token;
        return this.toPublicUser(await this.usersRepository.save(userFound));
    }

    async updateWithImage(file: Express.Multer.File, id: number, user: UpdateUserDto) {
        const userFound = await this.usersRepository.findOneBy({ id });
        if (!userFound) {
            throw new HttpException('Usuario no existe', HttpStatus.NOT_FOUND);
        }

        const extension = file.mimetype === 'image/png' ? 'png' : 'jpg';
        const url = await storage(file, `${randomUUID()}.${extension}`);
        if (!url) {
            throw new HttpException('La imagen no se pudo guardar', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        user.image = url;
        const updatedUser = Object.assign(userFound, user);
        return this.toPublicUser(await this.usersRepository.save(updatedUser));
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
