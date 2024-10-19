import { PrismaService } from './../prisma/prisma.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthSignUpDto } from './dto/auth.sign-up.dto';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { UserService } from 'src/user/user.service';
import { AuthSignInDto } from './dto/auth.sign-in.dto';
import { JwtUserInfo } from 'src/common/types/jwt-user-info.type';
// import { ConfigService } from 'src/config/config.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    // configService: ConfigService
  ) {}
  generateJwtPair(user: User) {
    const { id, name } = user;
    const payload: JwtUserInfo = { id, name };
    const accessTokenOptions: JwtSignOptions = { expiresIn: '8h' };
    const refreshTokenOptions: JwtSignOptions = { expiresIn: '12h' };

    return {
      accessToken: this.jwtService.sign(payload, accessTokenOptions),
      refreshToken: this.jwtService.sign(payload, refreshTokenOptions),
    };
  }
  async signUp(data: AuthSignUpDto) {
    const user = await this.userService.create(data);
    return this.generateJwtPair(user);
    // check if user existed
    // create user
  }
  async signIn(data: AuthSignInDto) {
    const user = await this.userService.getOneByEmail(data.email);
    if (!user || data.password !== user.password)
      throw new UnauthorizedException('User does not exist');

    if (user.deletedAt) throw new UnauthorizedException('User does not exist');

    return this.generateJwtPair(user);
    // check if user existed
    // create user
  }
}
