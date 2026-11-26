import { Body, Controller, Post, Get, UseGuards, Put, Param, ParseIntPipe, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Req, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtRolesGuard } from '../auth/jwt/jwt-roles.guard';
import { HasRoles } from 'src/auth/jwt/has-roles';
import { JwtRole } from 'src/auth/jwt/jwt-role';
import { AuthenticatedRequest } from '../auth/jwt/authenticated-request';
import { UpdateNotificationTokenDto } from './dto/update-notification-token.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, JwtRolesGuard)
export class UsersController {

    constructor(private usersService: UsersService) {}

    // GET -> OBTENER
    // POST -> CREAR
    // PUT ' PATCH -> ACTUALIZAR
    // DELETE ' => BORRAR
    
    @HasRoles(JwtRole.ADMIN)
    @Get() // http://localhost/users -> GET
    findAll() {
        return this.usersService.findAll();
    }

    @HasRoles(JwtRole.ADMIN)
    @Post()
    create(@Body() user: CreateUserDto) {
        return this.usersService.create(user);
    }
    
    @HasRoles(JwtRole.CLIENT, JwtRole.DRIVER)
    @Put(':id') // http://192.168.1.15:3000/users/:id -> PUT 
    update(@Param('id', ParseIntPipe) id: number, @Body() user: UpdateUserDto, @Req() request: AuthenticatedRequest) {
        if (id !== request.user.userId) {
            throw new ForbiddenException();
        }
        return this.usersService.update(request.user.userId, user);
    }

    @HasRoles(JwtRole.CLIENT, JwtRole.DRIVER)
    @Put('notification_token/:id') // http://192.168.1.15:3000/users/:id -> PUT 
    updateNotificationToken(@Param('id', ParseIntPipe) id: number, @Body() user: UpdateNotificationTokenDto, @Req() request: AuthenticatedRequest) {
        if (id !== request.user.userId) {
            throw new ForbiddenException();
        }
        return this.usersService.updateNotificationToken(request.user.userId, user);
    }

    @HasRoles(JwtRole.CLIENT, JwtRole.DRIVER)
    @Put('upload/:id')
    @UseInterceptors(FileInterceptor('file'))
    updateWithImage(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                  new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }),
                  new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
                ],
              }),
        ) file: Express.Multer.File,
        @Param('id', ParseIntPipe) id: number, 
        @Body() user: UpdateUserDto,
        @Req() request: AuthenticatedRequest
    ) {
        if (id !== request.user.userId) {
            throw new ForbiddenException();
        }
        return this.usersService.updateWithImage(file, request.user.userId, user);
    }
    

}
