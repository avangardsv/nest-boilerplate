import { ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import {
	IsBoolean,
	IsEmail,
	IsOptional,
	IsString,
	Length,
} from 'class-validator';

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
