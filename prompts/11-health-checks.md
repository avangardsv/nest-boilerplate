# Task: Implement Health Check Endpoints

## Context
The application needs health check endpoints for monitoring and orchestration systems (Kubernetes, Docker, load balancers). These endpoints allow external systems to determine if the application is running and ready to serve traffic.

## Current State
- No health check endpoints implemented
- No database connectivity checks
- No readiness/liveness probes

## Requirements

### 1. Install Required Dependencies

```bash
yarn add @nestjs/terminus
```

### 2. Create Health Module

Create `src/health/health.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
```

### 3. Create Health Service

Create `src/health/health.service.ts`:

```typescript
import {
  HealthCheckError,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => this.databasePingCheck(),
    ]);
  }

  private async databasePingCheck(): Promise<HealthIndicatorResult> {
    try {
      // Simple query to check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        database: {
          status: 'up',
          message: 'Database connection is healthy',
        },
      };
    } catch (error) {
      throw new HealthCheckError('Database connection failed', {
        database: {
          status: 'down',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }
}
```

### 4. Create Health Controller

Create `src/health/health.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckResult } from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get(['liveness', 'readiness'])
  @HealthCheck()
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Returns the health status of the application and its dependencies',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
                message: { type: 'string', example: 'Database connection is healthy' },
              },
            },
          },
        },
        error: { type: 'object' },
        details: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
                message: { type: 'string', example: 'Database connection is healthy' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Application is unhealthy',
  })
  async check(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }
}
```

### 5. Update App Module

Update `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
// ... other imports

@Module({
  imports: [
    // ... other modules
    HealthModule,
  ],
})
export class AppModule {}
```

### 6. Optional: Add Memory Health Indicator

Extend `health.service.ts` to include memory checks:

```typescript
import { MemoryHealthIndicator } from '@nestjs/terminus';

@Injectable()
export class HealthService {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => this.databasePingCheck(),
      // Check if memory usage is below 300MB
      async () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      // Check if RSS memory is below 500MB
      async () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),
    ]);
  }

  // ... databasePingCheck method
}
```

### 7. Optional: Add Disk Health Indicator

```typescript
import { DiskHealthIndicator } from '@nestjs/terminus';

@Injectable()
export class HealthService {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
    private readonly disk: DiskHealthIndicator,
  ) {}

  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => this.databasePingCheck(),
      // Check if disk storage is below 80% usage
      async () =>
        this.disk.checkStorage('storage', {
          thresholdPercent: 0.8,
          path: '/',
        }),
    ]);
  }

  // ... databasePingCheck method
}
```

## Usage

### Kubernetes Configuration

Example Kubernetes liveness and readiness probes:

```yaml
livenessProbe:
  httpGet:
    path: /health/liveness
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health/readiness
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

### Docker Compose

Example health check in docker-compose.yml:

```yaml
services:
  api:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health/liveness"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Expected Response

### Healthy Response (200)
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up",
      "message": "Database connection is healthy"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up",
      "message": "Database connection is healthy"
    }
  }
}
```

### Unhealthy Response (503)
```json
{
  "status": "error",
  "info": {},
  "error": {
    "database": {
      "status": "down",
      "message": "Connection timeout"
    }
  },
  "details": {
    "database": {
      "status": "down",
      "message": "Connection timeout"
    }
  }
}
```

## Testing Requirements

Create tests for:
- [ ] Health check returns 200 when database is healthy
- [ ] Health check returns 503 when database is down
- [ ] Health check includes all configured indicators
- [ ] Memory health indicator works correctly
- [ ] Disk health indicator works correctly
- [ ] Health check endpoint is accessible without authentication

## Benefits

- Enables proper orchestration in containerized environments
- Early detection of application issues
- Better monitoring and alerting
- Standardized health check format
- Supports Kubernetes liveness/readiness probes
- Can be extended with custom health indicators

## Additional Health Indicators

Consider adding:
- Redis connection check (if using Redis)
- External API connectivity check
- File system write permissions check
- Queue system health (if using message queues)

## References

- NestJS Terminus: https://docs.nestjs.com/recipes/terminus
- Kubernetes Probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

