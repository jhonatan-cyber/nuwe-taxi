import { IsEnum, IsInt } from 'class-validator';
import { Status } from '../client_requests.entity';

export class UpdateStatusClientRequestDto {
    @IsInt()
    id_client_request: number;

    @IsEnum(Status)
    status: Status;    
}