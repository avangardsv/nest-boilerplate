import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  IsOptional,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @IsString()
  @Length(1, 35)
  @ApiPropertyOptional({
    default: 'user name',
  })
  @IsOptional()
  name: string;
  @IsEmail()
  @IsOptional()
  @ApiPropertyOptional({
    default: 'user@email.com',
  })
  email: string;
}
