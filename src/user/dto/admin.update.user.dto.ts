import {
  IsEmail,
  IsString,
  Length,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class AdminUpdateUserDto {
  @Expose()
  @IsOptional()
  @IsString()
  @Length(1, 35)
  @ApiPropertyOptional({
    default: 'user name',
  })
  name: string;
  @Expose()
  @IsOptional()
  @IsEmail()
  @ApiPropertyOptional({
    default: 'user@email.com',
  })
  email: string;
  @Expose()
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    default: false,
  })
  isAdmin: boolean;
}
