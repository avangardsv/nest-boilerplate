import { Injectable } from '@nestjs/common';
import { configDotenv } from 'dotenv';
import { resolve } from 'path';
import { AuthSignUpDto } from 'src/auth/dto/auth.sign-up.dto';

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

  get defaultAdminUser(): AuthSignUpDto {
    return {
      email: this.getEnvValue('DEFAULT_USER_EMAIL'),
      name: this.getEnvValue('DEFAULT_USER_NAME'),
      password: this.getEnvValue('DEFAULT_USER_PASSWORD'),
    };
  }

  private getEnvValue(value: string) {
    if (!(value in process.env)) {
      throw new Error(`undefined env value ${value}`);
    }
    return process.env[value];
  }
}
