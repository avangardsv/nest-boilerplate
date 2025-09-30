import { ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

@Exclude()
export class UpdateUserDto {
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
}
