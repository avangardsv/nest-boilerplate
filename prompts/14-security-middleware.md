# Task: Implement Security Middleware and Best Practices

## Context
The application needs security middleware and configurations to protect against common web vulnerabilities, implement proper CORS, rate limiting, and other security best practices.

## Current State
- No security headers configured
- Basic CORS setup (if any)
- No rate limiting
- No request size limits
- No security middleware

## Requirements

### 1. Install Required Dependencies

```bash
yarn add helmet
yarn add @nestjs/throttler
yarn add -D @types/helmet
```

### 2. Configure Helmet for Security Headers

Update `src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false, // Adjust based on your needs
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Request size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ... rest of bootstrap
}
```

### 3. Configure Rate Limiting

Create `src/common/guards/throttler-behind-proxy.guard.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected getTracker(req: Request): string {
    // Use X-Forwarded-For header if behind proxy, otherwise use IP
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip;
  }
}
```

Update `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: config.rateLimitWindowMs,
        limit: config.rateLimitMax,
      }),
    }),
    // ... other modules
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
    // ... other providers
  ],
})
export class AppModule {}
```

### 4. Configure CORS Properly

Update `src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  if (configService.corsEnabled) {
    app.enableCors({
      origin: configService.corsOrigin,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400, // 24 hours
    });
  }

  // ... rest of bootstrap
}
```

### 5. Add Request ID Middleware

Create `src/common/middleware/request-id.middleware.ts`:

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Use existing X-Request-Id header or generate new one
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  }
}
```

Update `src/app.module.ts`:

```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  // ... module configuration
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
```

### 6. Add Security Headers Decorator

Create `src/common/decorators/security-headers.decorator.ts`:

```typescript
import { applyDecorators, Header } from '@nestjs/common';

export function SecurityHeaders() {
  return applyDecorators(
    Header('X-Content-Type-Options', 'nosniff'),
    Header('X-Frame-Options', 'DENY'),
    Header('X-XSS-Protection', '1; mode=block'),
    Header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains'),
  );
}
```

### 7. Configure Environment Variables

Update `.env.example`:

```bash
# Security
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
CORS_ENABLED=true

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# Request Limits
REQUEST_SIZE_LIMIT=10mb
```

### 8. Add Security Configuration to ConfigService

Update `src/config/config.service.ts`:

```typescript
// ... existing code

// Security Configuration
get corsOrigin(): string | string[] {
  const origin = this.get<string>('CORS_ORIGIN', '*');
  if (origin === '*') return '*';
  return origin.split(',').map((o) => o.trim());
}

get corsEnabled(): boolean {
  return this.get<string>('CORS_ENABLED', 'true').toLowerCase() === 'true';
}

get rateLimitMax(): number {
  const max = this.get<string>('RATE_LIMIT_MAX', '100');
  return parseInt(max, 10);
}

get rateLimitWindowMs(): number {
  const window = this.get<string>('RATE_LIMIT_WINDOW_MS', '60000');
  return parseInt(window, 10);
}

get requestSizeLimit(): string {
  return this.get<string>('REQUEST_SIZE_LIMIT', '10mb');
}
```

### 9. Optional: Add CSRF Protection

For forms and state-changing operations, consider adding CSRF protection:

```typescript
import * as csurf from 'csurf';

// Only apply to state-changing routes
app.use('/api', csurf({ cookie: true }));
```

### 10. Optional: Add IP Whitelisting

Create `src/common/guards/ip-whitelist.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const clientIp = request.ip || request.connection.remoteAddress;
    const whitelist = this.configService.get<string[]>('IP_WHITELIST', []);

    if (whitelist.length > 0 && !whitelist.includes(clientIp)) {
      throw new ForbiddenException('IP address not allowed');
    }

    return true;
  }
}
```

## Security Checklist

- [ ] Helmet configured with appropriate CSP
- [ ] CORS configured with specific origins (not *)
- [ ] Rate limiting enabled
- [ ] Request size limits configured
- [ ] Security headers set (X-Content-Type-Options, X-Frame-Options, etc.)
- [ ] Request ID tracking implemented
- [ ] HTTPS enforced in production
- [ ] Sensitive data not logged
- [ ] SQL injection protection (using parameterized queries)
- [ ] XSS protection headers
- [ ] CSRF protection for state-changing operations (if needed)

## Testing Requirements

Create tests for:
- [ ] Rate limiting blocks excessive requests
- [ ] CORS headers are set correctly
- [ ] Security headers are present in responses
- [ ] Request ID is generated and included in headers
- [ ] Request size limits are enforced
- [ ] IP whitelist guard works correctly (if implemented)

## Production Considerations

1. **HTTPS**: Always use HTTPS in production
2. **CORS**: Never use `*` for CORS origin in production
3. **Rate Limiting**: Adjust limits based on your API usage patterns
4. **Security Headers**: Review and adjust CSP based on your application needs
5. **Monitoring**: Monitor for security-related errors and rate limit violations
6. **Logging**: Don't log sensitive information (passwords, tokens, etc.)

## Benefits

- Protection against common web vulnerabilities
- Rate limiting prevents abuse
- Proper CORS configuration
- Security headers protect against XSS, clickjacking, etc.
- Request tracking for debugging
- Configurable security settings

## References

- Helmet: https://helmetjs.github.io/
- NestJS Throttler: https://docs.nestjs.com/security/rate-limiting
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Security Headers: https://securityheaders.com/

