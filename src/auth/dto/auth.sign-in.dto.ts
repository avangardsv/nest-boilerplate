import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class AuthSignInDto {
	@ApiProperty()
	@IsEmail()
	@IsNotEmpty()
	@ApiProperty({
		default: 'user@email.com',
	})
	email: string;
	@IsNotEmpty()
	@IsString()
	@Length(8, 100)
	@ApiProperty({
		default: 'testpassword',
	})
	password: string;
}
