# Task: Implement API Versioning

## Context
The application needs API versioning to support future changes without breaking existing clients. This allows for backward compatibility and gradual migration of clients to new API versions.

## Current State
- No API versioning implemented
- All routes are at root level (e.g., `/auth`, `/tasks`)
- No version prefix in routes
- Swagger documentation doesn't reflect versioning

## Requirements

### 1. Update Main Application Setup

Update `src/main.ts` to set global API prefix:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Set global API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger configuration
  if (configService.swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle(configService.appName)
      .setDescription('API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  // ... rest of bootstrap
}
```

### 2. Create Version Controller Decorator

Create `src/common/decorators/api-version.decorator.ts`:

```typescript
import { applyDecorators, Controller } from '@nestjs/common';

export const ApiVersion = (version: string) => {
  return applyDecorators(Controller(`api/${version}`));
};
```

### 3. Update Controllers

Update controllers to use versioned routes:

#### Example: Auth Controller

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApiVersion } from '../common/decorators/api-version.decorator';
import { AuthService } from './auth.service';

@ApiVersion('v1')
@ApiTags('authorization')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin')
  @ApiOperation({ summary: 'Sign in with email and password' })
  signIn(@Body() data: AuthSignInDto) {
    return this.authService.signIn(data);
  }

  // ... other endpoints
}
```

#### Example: Task Controller

```typescript
import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApiVersion } from '../common/decorators/api-version.decorator';
import { TaskService } from './task.service';

@ApiVersion('v1')
@ApiTags('tasks')
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tasks' })
  findAll(@Query() query: PaginationDto) {
    return this.taskService.findAll(query);
  }

  // ... other endpoints
}
```

### 4. Create Version Module (Optional - for future versions)

Create `src/api/v2/v2.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { V2TaskController } from './task/task.controller';
import { TaskModule } from '../../task/task.module';

@Module({
  imports: [TaskModule],
  controllers: [V2TaskController],
})
export class V2Module {}
```

### 5. Update App Module

Update `src/app.module.ts` to support multiple versions:

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { TaskModule } from './task/task.module';
// ... other modules

@Module({
  imports: [
    // ... existing modules
    AuthModule,
    TaskModule,
    // V2Module, // Uncomment when ready for v2
  ],
})
export class AppModule {}
```

### 6. Update Swagger Configuration

Update Swagger to show version in documentation:

```typescript
const config = new DocumentBuilder()
  .setTitle(configService.appName)
  .setDescription('API Documentation - Version 1.0')
  .setVersion('1.0')
  .addServer('http://localhost:3000/api/v1', 'Development Server')
  .addServer('https://api.example.com/api/v1', 'Production Server')
  .addBearerAuth()
  .build();
```

### 7. Create Version Middleware (Optional)

Create `src/common/middleware/api-version.middleware.ts`:

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ApiVersionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract version from URL
    const versionMatch = req.url.match(/\/api\/(v\d+)\//);
    if (versionMatch) {
      req['apiVersion'] = versionMatch[1];
    }

    // Add version header
    res.setHeader('X-API-Version', req['apiVersion'] || 'v1');

    next();
  }
}
```

### 8. Update Health Check Route

Health check should remain unversioned:

```typescript
@Controller() // No version prefix
@ApiTags('health')
export class HealthController {
  @Get('health')
  check() {
    return this.healthService.check();
  }
}
```

## Route Structure

After implementation, routes will be:

- `GET /api/v1/tasks` - Get all tasks
- `POST /api/v1/tasks` - Create task
- `GET /api/v1/tasks/:id` - Get task by ID
- `POST /api/v1/auth/signin` - Sign in
- `POST /api/v1/auth/signup` - Sign up
- `GET /health` - Health check (unversioned)

## Migration Strategy

1. **Phase 1**: Add version prefix to all existing routes
2. **Phase 2**: Update frontend clients to use versioned routes
3. **Phase 3**: When breaking changes are needed, create v2 routes
4. **Phase 4**: Deprecate old version after migration period

## Versioning Best Practices

1. **Semantic Versioning**: Use major version numbers (v1, v2, v3) for breaking changes
2. **Backward Compatibility**: Maintain old versions during migration period
3. **Deprecation Headers**: Add `Deprecation` header to old versions
4. **Documentation**: Clearly document version differences
5. **Sunset Policy**: Define when old versions will be removed

## Testing Requirements

Create tests for:
- [ ] Versioned routes are accessible
- [ ] Unversioned routes return 404
- [ ] Health check remains unversioned
- [ ] Swagger documentation shows correct version
- [ ] Version header is set correctly

## Benefits

- Backward compatibility
- Gradual migration path
- Clear API evolution
- Better client management
- Professional API structure

## Future Considerations

When creating v2:
1. Create new controllers in `src/api/v2/`
2. Share services between versions
3. Use feature flags to enable/disable versions
4. Monitor usage of each version
5. Plan deprecation timeline

## References

- REST API Versioning: https://restfulapi.net/versioning/
- API Versioning Best Practices: https://www.baeldung.com/rest-versioning

