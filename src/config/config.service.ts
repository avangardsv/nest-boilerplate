import { Injectable } from '@nestjs/common';
import { configDotenv } from 'dotenv';
import { resolve } from 'path';

@Injectable()
export class ConfigService {
  constructor() {
    configDotenv({ path: resolve(process.cwd(), '.env') });
  }

  get jwtSecret() {
    return this.getEnvValue('JWT_SECRET');
  }

  private getEnvValue(value: string) {
    if (!(value in process.env)) {
      throw new Error(`undefined env value ${value}`);
    }
    return process.env[value];
  }
}
