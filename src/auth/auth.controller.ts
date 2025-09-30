import {
	Body,
	Controller,
	NotImplementedException,
	Post,
} from '@nestjs/common';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthSignInDto } from './dto/auth.sign-in.dto';
import { AuthSignUpDto } from './dto/auth.sign-up.dto';

@ApiTags('authorization')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Post('signin')
	signIn(
		@Body()
		data: AuthSignInDto,
	) {
		return this.authService.signIn(data);
	}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Post('signup')
	signUp(
		@Body()
		data: AuthSignUpDto,
	) {
		return this.authService.signUp(data);
	}

	@Post('refresh')
	refresh(): void {
		throw new NotImplementedException();
	}
}
