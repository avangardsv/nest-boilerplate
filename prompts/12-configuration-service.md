# Task: Implement Type-Safe Configuration Service

## Context
The application currently uses basic ConfigService from @nestjs/config, but we need a type-safe, centralized configuration service that provides better developer experience, type safety, and validation of environment variables.

## Current State
- Basic ConfigService usage scattered across modules
- No centralized configuration
- No type safety for environment variables
- No validation of required variables
- No default values management

## Requirements

### 1. Create Configuration Module

Create `src/config/config.module.ts`:

```typescript
import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigService } from './config.service';
import { validate } from './config.validation';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
```

### 2. Create Configuration Service

Create `src/config/config.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService extends NestConfigService {
  // Application Configuration
  get appEnv(): string {
    return this.getOrThrow<string>('NODE_ENV');
  }

  get port(): number {
    const port = this.get<string>('PORT', '3000');
    const parsedPort = parseInt(port, 10);
    return isNaN(parsedPort) ? 3000 : parsedPort;
  }

  get appName(): string {
    return this.get<string>('APP_NAME', 'nestjs-boilerplate');
  }

  // Database Configuration
  get databaseUrl(): string {
    return this.getOrThrow<string>('DATABASE_URL');
  }

  get databaseHost(): string {
    return this.get<string>('DATABASE_HOST', 'localhost');
  }

  get databasePort(): number {
    const port = this.get<string>('DATABASE_PORT', '5432');
    return parseInt(port, 10);
  }

  get databaseUser(): string {
    return this.get<string>('DATABASE_USER', 'postgres');
  }

  get databasePassword(): string {
    return this.getOrThrow<string>('DATABASE_PASSWORD');
  }

  get databaseName(): string {
    return this.get<string>('DATABASE_NAME', 'nestjs_boilerplate');
  }

  // JWT Configuration
  get jwtSecret(): string {
    return this.getOrThrow<string>('JWT_SECRET');
  }

  get jwtExpiresIn(): string {
    return this.get<string>('JWT_EXPIRES_IN', '7d');
  }

  get jwtRefreshSecret(): string {
    return this.get<string>('JWT_REFRESH_SECRET', this.jwtSecret);
  }

  get jwtRefreshExpiresIn(): string {
    return this.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');
  }

  // Password Configuration
  get passwordSaltRounds(): number {
    const rounds = this.get<string>('PASSWORD_SALT_ROUNDS', '10');
    return parseInt(rounds, 10);
  }

  // CORS Configuration
  get corsOrigin(): string | string[] {
    const origin = this.get<string>('CORS_ORIGIN', '*');
    if (origin === '*') return '*';
    return origin.split(',').map((o) => o.trim());
  }

  get corsEnabled(): boolean {
    return this.get<string>('CORS_ENABLED', 'true').toLowerCase() === 'true';
  }

  // Logging Configuration
  get logLevel(): string {
    return this.get<string>('LOG_LEVEL', 'info');
  }

  // Swagger Configuration
  get swaggerEnabled(): boolean {
    return this.get<string>('SWAGGER_ENABLED', 'false').toLowerCase() === 'true';
  }

  get swaggerPath(): string {
    return this.get<string>('SWAGGER_PATH', 'api');
  }

  // Security Configuration
  get rateLimitMax(): number {
    const max = this.get<string>('RATE_LIMIT_MAX', '100');
    return parseInt(max, 10);
  }

  get rateLimitWindowMs(): number {
    const window = this.get<string>('RATE_LIMIT_WINDOW_MS', '60000');
    return parseInt(window, 10);
  }

  // Helper methods
  get isDevelopment(): boolean {
    return this.appEnv === 'development';
  }

  get isProduction(): boolean {
    return this.appEnv === 'production';
  }

  get isTest(): boolean {
    return this.appEnv === 'test';
  }
}
```

### 3. Create Configuration Validation Schema

Create `src/config/config.validation.ts`:

```typescript
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsString, validateSync, Min, Max } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number;

  @IsString()
  APP_NAME: string;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  DATABASE_PASSWORD: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  PASSWORD_SALT_ROUNDS: string;
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
```

### 4. Update main.ts

Update `src/main.ts` to use the configuration service:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // CORS
  if (configService.corsEnabled) {
    app.enableCors({
      origin: configService.corsOrigin,
      credentials: true,
    });
  }

  // Swagger
  if (configService.swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle(configService.appName)
      .setDescription('API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(configService.swaggerPath, app, document);
  }

  await app.listen(configService.port);

  console.log(`Application is running on: http://localhost:${configService.port}`);
  if (configService.swaggerEnabled) {
    console.log(`Swagger is available at: http://localhost:${configService.port}/${configService.swaggerPath}`);
  }
}

bootstrap();
```

### 5. Usage in Services

Example usage in a service:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';

@Injectable()
export class AuthService {
  constructor(private readonly configService: ConfigService) {}

  async signIn(email: string, password: string) {
    // Use type-safe configuration
    const jwtSecret = this.configService.jwtSecret;
    const expiresIn = this.configService.jwtExpiresIn;

    // ... authentication logic
  }
}
```

### 6. Update .env.example

Ensure `.env.example` includes all required variables:

```bash
# Application
NODE_ENV=development
PORT=3000
APP_NAME=nestjs-boilerplate

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=nestjs_boilerplate

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-key-here
JWT_REFRESH_EXPIRES_IN=30d

# Password
PASSWORD_SALT_ROUNDS=10

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
CORS_ENABLED=true

# Logging
LOG_LEVEL=info

# Swagger
SWAGGER_ENABLED=true
SWAGGER_PATH=api

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

## Testing Requirements

Create tests for:
- [ ] Configuration service returns correct values
- [ ] Configuration validation throws error for invalid values
- [ ] Default values are used when variables are not set
- [ ] Required variables throw error when missing
- [ ] Type conversions work correctly (string to number, etc.)
- [ ] Helper methods (isDevelopment, isProduction) work correctly

## Benefits

- Type-safe configuration access
- Centralized configuration management
- Environment variable validation on startup
- Better developer experience with autocomplete
- Default values for optional configurations
- Clear error messages for missing required variables
- Easy to extend with new configuration options

## Best Practices

- Always use `getOrThrow` for required variables
- Provide sensible defaults for optional variables
- Use helper methods for common checks (isDevelopment, etc.)
- Document configuration options in .env.example
- Validate configuration on application startup
- Use enums for environment types

## References

- NestJS Configuration: https://docs.nestjs.com/techniques/configuration
- class-validator: https://github.com/typestack/class-validator
- class-transformer: https://github.com/typestack/class-transformer

