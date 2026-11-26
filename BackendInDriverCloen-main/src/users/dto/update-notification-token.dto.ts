import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateNotificationTokenDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(4096)
  notification_token: string;
}