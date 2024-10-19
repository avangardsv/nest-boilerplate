import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class AuthSignUpDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    default: 'user@email.com',
  })
  email: string;
  @IsOptional()
  @IsString()
  @Length(1, 35)
  @ApiPropertyOptional({
    default: 'user name',
  })
  name?: string;
  @IsNotEmpty()
  @IsString()
  @Length(8, 100)
  @ApiProperty({
    default: 'testpassword',
  })
  password: string;
}
