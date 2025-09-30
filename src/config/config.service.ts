import { resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { configDotenv } from 'dotenv';

@Injectable()
export class ConfigService {
	constructor() {
		configDotenv({ path: resolve(process.cwd(), '.env') });
	}

	get jwtSecret() {
		return this.getEnvValue('JWT_SECRET');
	}

	get passwordSalt() {
		return this.getEnvValue('PASSWORD_SALT');
	}

	private getEnvValue(value: string) {
		if (!(value in process.env)) {
			throw new Error(`undefined env value ${value}`);
		}
		return process.env[value];
	}
}
