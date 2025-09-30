import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUserInfo } from 'src/common/types/jwt-user-info.type';
import { ConfigService } from 'src/config/config.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
	private logger = new Logger(JwtStrategy.name);

	constructor(configService: ConfigService) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			secretOrKey: configService.jwtSecret,
			ignoreExpiration: false,
		});
	}

	validate(payload: JwtUserInfo) {
		this.logger.debug(payload);
		return payload;
	}
}
