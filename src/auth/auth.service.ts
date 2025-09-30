import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { hash } from 'bcrypt';
import { JwtUserInfo } from 'src/common/types/jwt-user-info.type';
import { ConfigService } from 'src/config/config.service';
import { UserService } from 'src/user/user.service';
import { PrismaService } from './../prisma/prisma.service';
import { AuthSignInDto } from './dto/auth.sign-in.dto';
import { AuthSignUpDto } from './dto/auth.sign-up.dto';

@Injectable()
export class AuthService {
	constructor(
		readonly _prismaService: PrismaService,
		private readonly jwtService: JwtService,
		private readonly userService: UserService,
		private readonly configService: ConfigService,
	) {}

	generateJwtPair(user: User) {
		const { id, name, isAdmin } = user;
		const payload: JwtUserInfo = { id, name, isAdmin };
		const accessTokenOptions: JwtSignOptions = { expiresIn: '8h' };
		const refreshTokenOptions: JwtSignOptions = { expiresIn: '12h' };

		return {
			accessToken: this.jwtService.sign(payload, accessTokenOptions),
			refreshToken: this.jwtService.sign(payload, refreshTokenOptions),
		};
	}
	async signUp(data: AuthSignUpDto) {
		const passwordHash = await hash(
			data.password,
			this.configService.passwordSalt,
		);

		const user = await this.userService.create({
			...data,
			password: passwordHash,
		});

		return this.generateJwtPair(user);
	}

	async signIn(data: AuthSignInDto) {
		const { password } = data;
		const hashedPassword = await hash(
			password,
			this.configService.passwordSalt,
		);

		const user = await this.userService.getOneByEmail(data.email);
		if (!user || hashedPassword !== user.password)
			throw new NotFoundException('User does not exist');

		if (user.deletedAt) throw new NotFoundException('User does not exist');

		return this.generateJwtPair(user);
	}
}
