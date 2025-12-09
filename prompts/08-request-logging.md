# Task: Implement Request Logging Middleware

## Context
The application currently lacks comprehensive request/response logging. We need structured logging that captures HTTP requests, responses, errors, and application events with proper context tracking and performance metrics.

## Current State
- No request logging implemented
- Only basic Logger usage in some services
- No correlation IDs for request tracing
- No performance metrics
- No structured logging format

## Requirements

### 1. Install Required Dependencies

```bash
yarn add pino pino-http pino-pretty
yarn add -D @types/pino-http
```

**Why Pino?**
- Extremely fast (minimal performance impact)
- Structured JSON logging (machine-readable)
- Pretty printing for development
- Wide ecosystem support
- Production-ready

### 2. Create Logger Module

Create `src/logger/logger.module.ts`:

```typescript
import { Module, Global } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Global()
@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
```

### 3. Create Logger Service

Create `src/logger/logger.service.ts`:

```typescript
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino, { Logger as PinoLogger } from 'pino';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: PinoLogger;

  constructor(private configService: ConfigService) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    this.logger = pino({
      level: this.configService.get('LOG_LEVEL') || 'info',
      // Pretty print in development, JSON in production
      transport: isProduction
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
              singleLine: true,
            },
          },
      // Base fields included in every log
      base: {
        env: this.configService.get('NODE_ENV'),
        app: this.configService.get('APP_NAME') || 'nestjs-boilerplate',
      },
      // Serialize errors properly
      serializers: {
        err: pino.stdSerializers.err,
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
      },
    });
  }

  log(message: string, context?: string, metadata?: Record<string, any>) {
    this.logger.info({ context, ...metadata }, message);
  }

  error(message: string, trace?: string, context?: string, metadata?: Record<string, any>) {
    this.logger.error({ context, trace, ...metadata }, message);
  }

  warn(message: string, context?: string, metadata?: Record<string, any>) {
    this.logger.warn({ context, ...metadata }, message);
  }

  debug(message: string, context?: string, metadata?: Record<string, any>) {
    this.logger.debug({ context, ...metadata }, message);
  }

  verbose(message: string, context?: string, metadata?: Record<string, any>) {
    this.logger.trace({ context, ...metadata }, message);
  }

  // Additional helper methods
  logRequest(method: string, url: string, statusCode: number, responseTime: number, metadata?: Record<string, any>) {
    this.logger.info(
      {
        type: 'http_request',
        method,
        url,
        statusCode,
        responseTime,
        ...metadata,
      },
      `${method} ${url} ${statusCode} - ${responseTime}ms`,
    );
  }

  logDatabaseQuery(query: string, duration: number, metadata?: Record<string, any>) {
    this.logger.debug(
      {
        type: 'database_query',
        query,
        duration,
        ...metadata,
      },
      `Database query executed in ${duration}ms`,
    );
  }

  getChildLogger(context: string): PinoLogger {
    return this.logger.child({ context });
  }

  getPinoInstance(): PinoLogger {
    return this.logger;
  }
}
```

### 4. Create Request Logging Middleware

Create `src/common/middleware/request-logger.middleware.ts`:

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../../logger/logger.service';

// Extend Express Request to include our custom properties
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Generate unique request ID
    const requestId = this.generateRequestId();
    req.requestId = requestId;
    req.startTime = Date.now();

    // Add request ID to response headers
    res.setHeader('X-Request-Id', requestId);

    // Log incoming request
    this.logger.log('Incoming request', 'HTTP', {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      query: req.query,
      // Don't log sensitive data
      body: this.sanitizeBody(req.body),
    });

    // Capture response
    const originalSend = res.send;
    res.send = function (data) {
      res.send = originalSend;
      return originalSend.call(this, data);
    };

    // Log on response finish
    res.on('finish', () => {
      const responseTime = Date.now() - req.startTime!;
      const logLevel = res.statusCode >= 400 ? 'warn' : 'log';

      this.logger[logLevel]('Request completed', 'HTTP', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime,
        contentLength: res.get('content-length'),
      });

      // Separate performance tracking
      if (responseTime > 1000) {
        this.logger.warn('Slow request detected', 'Performance', {
          requestId,
          method: req.method,
          url: req.url,
          responseTime,
        });
      }
    });

    // Log on response error
    res.on('error', (error) => {
      this.logger.error('Response error', error.stack, 'HTTP', {
        requestId,
        method: req.method,
        url: req.url,
        error: error.message,
      });
    });

    next();
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'creditCard'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
```

### 5. Create Request Context Service

Create `src/common/services/request-context.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId: string;
  userId?: string;
  userEmail?: string;
  timestamp: Date;
}

@Injectable()
export class RequestContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

  run(context: RequestContext, callback: () => void) {
    this.asyncLocalStorage.run(context, callback);
  }

  getContext(): RequestContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  getRequestId(): string | undefined {
    return this.getContext()?.requestId;
  }

  getUserId(): string | undefined {
    return this.getContext()?.userId;
  }

  setUserId(userId: string) {
    const context = this.getContext();
    if (context) {
      context.userId = userId;
    }
  }

  setUserEmail(email: string) {
    const context = this.getContext();
    if (context) {
      context.userEmail = email;
    }
  }
}
```

### 6. Create Context Middleware

Create `src/common/middleware/request-context.middleware.ts`:

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from '../services/request-context.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private contextService: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const context = {
      requestId: req.requestId || this.generateRequestId(),
      timestamp: new Date(),
    };

    this.contextService.run(context, () => {
      next();
    });
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 7. Update App Module

Update `src/app.module.ts`:

```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerModule } from './logger/logger.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { RequestContextService } from './common/services/request-context.service';

@Module({
  imports: [
    LoggerModule,
    // ... other modules
  ],
  providers: [RequestContextService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestContextMiddleware, RequestLoggerMiddleware)
      .forRoutes('*');
  }
}
```

### 8. Update main.ts

Use custom logger in main.ts:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerService } from './logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use custom logger
  const logger = app.get(LoggerService);
  app.useLogger(logger);

  // ... rest of bootstrap

  await app.listen(3000);
  logger.log('Application started', 'Bootstrap', {
    port: 3000,
    environment: process.env.NODE_ENV,
  });
}

bootstrap();
```

### 9. Add Logging to Services

Example usage in services:

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import { RequestContextService } from '../common/services/request-context.service';

@Injectable()
export class TaskService {
  constructor(
    private logger: LoggerService,
    private contextService: RequestContextService,
    private prisma: PrismaClient,
  ) {}

  async createTask(data: CreateTaskDto) {
    const requestId = this.contextService.getRequestId();
    const userId = this.contextService.getUserId();

    this.logger.log('Creating task', 'TaskService', {
      requestId,
      userId,
      taskName: data.name,
    });

    try {
      const task = await this.prisma.task.create({ data });

      this.logger.log('Task created successfully', 'TaskService', {
        requestId,
        taskId: task.id,
        taskName: task.name,
      });

      return task;
    } catch (error) {
      this.logger.error('Failed to create task', error.stack, 'TaskService', {
        requestId,
        userId,
        error: error.message,
      });
      throw error;
    }
  }
}
```

### 10. Environment Configuration

Update `.env.example`:

```bash
# Logging Configuration
LOG_LEVEL=info  # trace, debug, info, warn, error
```

Update `src/config/` to include log level.

## Log Levels Guide

```
trace   - Very detailed, use for debugging deep issues
debug   - Debugging information (database queries, business logic)
info    - General information (requests, important events)
warn    - Warning messages (slow requests, deprecated usage)
error   - Error messages (exceptions, failures)
```

## Expected Log Output

### Development (Pretty)
```
[2024-01-15 10:30:00] INFO (HTTP): Incoming request
  requestId: "1705315800000-abc123"
  method: "POST"
  url: "/task"
  userAgent: "Mozilla/5.0..."

[2024-01-15 10:30:00] INFO (TaskService): Creating task
  requestId: "1705315800000-abc123"
  userId: "user-uuid"
  taskName: "New Task"

[2024-01-15 10:30:00] INFO (HTTP): Request completed
  requestId: "1705315800000-abc123"
  method: "POST"
  url: "/task"
  statusCode: 201
  responseTime: 45
```

### Production (JSON)
```json
{
  "level": 30,
  "time": 1705315800000,
  "env": "production",
  "app": "nestjs-boilerplate",
  "context": "HTTP",
  "requestId": "1705315800000-abc123",
  "method": "POST",
  "url": "/task",
  "statusCode": 201,
  "responseTime": 45,
  "msg": "Request completed"
}
```

## Testing Requirements

Verify:
- [ ] All HTTP requests logged with request ID
- [ ] Response times tracked
- [ ] Slow requests (>1s) logged as warnings
- [ ] Errors include stack traces
- [ ] Sensitive data (passwords) redacted from logs
- [ ] Request ID propagates through entire request lifecycle
- [ ] Log level configurable via environment variable
- [ ] Pretty printing in development
- [ ] JSON output in production
- [ ] User context captured after authentication

## Performance Considerations

- Pino is extremely fast (minimal overhead)
- Async logging doesn't block request processing
- Structured logs are machine-readable for log aggregation
- Request ID allows tracing requests across services

## Expected Outcomes

After implementation:
- Every request logged with unique ID
- Full request/response lifecycle visibility
- Performance metrics tracked automatically
- Structured logs ready for aggregation (ELK, Datadog, etc.)
- Easy debugging with request tracing
- Sensitive data automatically redacted
- Environment-appropriate formatting

## References

- Pino documentation: https://getpino.io/
- NestJS logging: https://docs.nestjs.com/techniques/logger
- Structured logging best practices
