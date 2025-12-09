# Task: Implement Global Exception Filter

## Context
The application currently only handles Prisma-specific errors through `PrismaKnownErrorFilter`. We need a comprehensive global exception filter to handle all HTTP exceptions, validation errors, and unexpected errors with consistent response formatting and proper logging.

## Current State
- Only `PrismaKnownErrorFilter` exists in `src/prisma/filters/`
- Applied globally in `main.ts`: `app.useGlobalFilters(new PrismaKnownErrorFilter())`
- No handling for general HTTP exceptions
- No centralized error logging
- No consistent error response format across the application

## Requirements

### 1. Create Global HTTP Exception Filter

Create `src/common/filters/http-exception.filter.ts`:

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.getHttpStatus(exception);
    const errorResponse = this.getErrorResponse(exception, request, status);

    // Log the error
    this.logError(exception, request, status);

    response.status(status).json(errorResponse);
  }

  private getHttpStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getErrorResponse(
    exception: unknown,
    request: Request,
    status: number,
  ) {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    // Base response structure
    const baseResponse = {
      statusCode: status,
      timestamp,
      path,
      method,
    };

    // Handle HttpException (includes NestJS exceptions)
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      // If response is an object, merge it
      if (typeof response === 'object') {
        return {
          ...baseResponse,
          ...(response as object),
        };
      }

      // If response is a string, use it as message
      return {
        ...baseResponse,
        message: response,
        error: exception.name,
      };
    }

    // Handle unknown errors
    if (exception instanceof Error) {
      return {
        ...baseResponse,
        message: this.isProduction()
          ? 'Internal server error'
          : exception.message,
        error: exception.name,
        ...(this.isProduction() ? {} : { stack: exception.stack }),
      };
    }

    // Fallback for non-Error exceptions
    return {
      ...baseResponse,
      message: 'Internal server error',
      error: 'UnknownError',
    };
  }

  private logError(exception: unknown, request: Request, status: number) {
    const message = exception instanceof Error ? exception.message : 'Unknown error';
    const stack = exception instanceof Error ? exception.stack : undefined;

    const logContext = {
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.get('user-agent'),
      status,
    };

    // Log based on severity
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${message}`,
        stack,
        JSON.stringify(logContext),
      );
    } else if (status >= 400) {
      this.logger.warn(
        `${request.method} ${request.url} - ${message}`,
        JSON.stringify(logContext),
      );
    }
  }

  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }
}
```

### 2. Create Validation Exception Filter

Create `src/common/filters/validation-exception.filter.ts` for better validation error messages:

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ValidationError } from 'class-validator';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Check if this is a validation error
    const isValidationError =
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse &&
      Array.isArray((exceptionResponse as any).message);

    if (isValidationError) {
      const validationErrors = (exceptionResponse as any).message;

      response.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        error: 'Validation Failed',
        message: 'Request validation failed',
        validationErrors: this.formatValidationErrors(validationErrors),
      });
    } else {
      // Not a validation error, pass through
      response.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ...exceptionResponse,
      });
    }
  }

  private formatValidationErrors(errors: any[]): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};

    errors.forEach((error) => {
      if (typeof error === 'string') {
        // Simple string error
        if (!formatted['_general']) formatted['_general'] = [];
        formatted['_general'].push(error);
      } else if (error.property && error.constraints) {
        // ValidationError from class-validator
        const messages = Object.values(error.constraints) as string[];
        formatted[error.property] = messages;
      }
    });

    return formatted;
  }
}
```

### 3. Create Standard Error Response DTO

Create `src/common/dto/error-response.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/users' })
  path: string;

  @ApiProperty({ example: 'POST' })
  method: string;

  @ApiProperty({ example: 'Validation failed' })
  message: string;

  @ApiProperty({ example: 'BadRequestException' })
  error: string;

  @ApiProperty({ required: false })
  validationErrors?: Record<string, string[]>;

  @ApiProperty({ required: false })
  stack?: string;
}
```

### 4. Update main.ts

Apply filters in correct order:

```typescript
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaKnownErrorFilter } from './prisma/filters/prisma-known-error.filter';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply filters in order (most specific to most general)
  app.useGlobalFilters(
    new ValidationExceptionFilter(),     // Handles validation errors specifically
    new PrismaKnownErrorFilter(),        // Handles Prisma errors specifically
    new GlobalHttpExceptionFilter(),      // Catches everything else
  );

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      forbidUnknownValues: true,
      forbidNonWhitelisted: true,
      whitelist: true, // Strip unknown properties
    }),
  );

  // ... rest of bootstrap
}
```

### 5. Create Custom Exception Classes

Create `src/common/exceptions/` directory with custom exceptions:

#### src/common/exceptions/business.exception.ts
```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(message: string, statusCode = HttpStatus.BAD_REQUEST) {
    super(
      {
        error: 'Business Rule Violation',
        message,
      },
      statusCode,
    );
  }
}
```

#### src/common/exceptions/resource-not-found.exception.ts
```typescript
import { NotFoundException } from '@nestjs/common';

export class ResourceNotFoundException extends NotFoundException {
  constructor(resourceName: string, identifier: string | number) {
    super({
      error: 'Resource Not Found',
      message: `${resourceName} with identifier '${identifier}' was not found`,
      resource: resourceName,
      identifier,
    });
  }
}
```

#### src/common/exceptions/insufficient-permissions.exception.ts
```typescript
import { ForbiddenException } from '@nestjs/common';

export class InsufficientPermissionsException extends ForbiddenException {
  constructor(action: string, resource: string) {
    super({
      error: 'Insufficient Permissions',
      message: `You do not have permission to ${action} this ${resource}`,
      action,
      resource,
    });
  }
}
```

### 6. Update Services to Use Custom Exceptions

Example usage in services:

```typescript
// Before
async getTaskById(id: string) {
  const task = await this.prisma.task.findUnique({ where: { id } });
  if (!task) {
    throw new NotFoundException('Task not found');
  }
  return task;
}

// After
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';

async getTaskById(id: string) {
  const task = await this.prisma.task.findUnique({ where: { id } });
  if (!task) {
    throw new ResourceNotFoundException('Task', id);
  }
  return task;
}

// Permission check example
async updateTask(id: string, userId: string, data: UpdateTaskDto) {
  const task = await this.getTaskById(id);

  if (task.reporterId !== userId && task.assigneeId !== userId) {
    throw new InsufficientPermissionsException('update', 'task');
  }

  return this.prisma.task.update({ where: { id }, data });
}
```

### 7. Add Swagger Documentation

Document error responses in controllers:

```typescript
import { ApiResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from '@common/dto/error-response.dto';

@ApiResponse({
  status: 400,
  description: 'Validation failed',
  type: ErrorResponseDto,
})
@ApiResponse({
  status: 401,
  description: 'Unauthorized',
  type: ErrorResponseDto,
})
@ApiResponse({
  status: 403,
  description: 'Forbidden',
  type: ErrorResponseDto,
})
@ApiResponse({
  status: 404,
  description: 'Resource not found',
  type: ErrorResponseDto,
})
@ApiResponse({
  status: 500,
  description: 'Internal server error',
  type: ErrorResponseDto,
})
@Get(':id')
async getTaskById(@Param('id') id: string) {
  return this.taskService.getTaskById(id);
}
```

## Testing Requirements

Test all error scenarios:

### 1. Validation Errors
```bash
# Missing required field
POST /auth/signup
{
  "email": "invalid-email",
  # missing password
}

# Expected response:
{
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/auth/signup",
  "method": "POST",
  "error": "Validation Failed",
  "message": "Request validation failed",
  "validationErrors": {
    "email": ["email must be a valid email"],
    "password": ["password should not be empty"]
  }
}
```

### 2. Not Found Errors
```bash
GET /task/non-existent-uuid

# Expected response:
{
  "statusCode": 404,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/task/non-existent-uuid",
  "method": "GET",
  "error": "Resource Not Found",
  "message": "Task with identifier 'non-existent-uuid' was not found",
  "resource": "Task",
  "identifier": "non-existent-uuid"
}
```

### 3. Permission Errors
```bash
# Try to update someone else's task
PATCH /task/someone-elses-task-id

# Expected response:
{
  "statusCode": 403,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/task/someone-elses-task-id",
  "method": "PATCH",
  "error": "Insufficient Permissions",
  "message": "You do not have permission to update this task",
  "action": "update",
  "resource": "task"
}
```

### 4. Prisma Errors (Still Handled)
```bash
# Duplicate email
POST /auth/signup
{
  "email": "existing@example.com",
  "password": "Password123!"
}

# Prisma unique constraint violation handled by PrismaKnownErrorFilter
```

### 5. Unexpected Errors
Simulate an unexpected error and verify:
- Returns 500 status code
- Hides stack trace in production
- Shows stack trace in development
- Logs full error details

## File Structure

```
src/
├── common/
│   ├── filters/
│   │   ├── http-exception.filter.ts
│   │   └── validation-exception.filter.ts
│   ├── exceptions/
│   │   ├── business.exception.ts
│   │   ├── resource-not-found.exception.ts
│   │   └── insufficient-permissions.exception.ts
│   └── dto/
│       └── error-response.dto.ts
└── prisma/
    └── filters/
        └── prisma-known-error.filter.ts
```

## Validation Checklist

- [ ] GlobalHttpExceptionFilter created
- [ ] ValidationExceptionFilter created
- [ ] Custom exception classes created
- [ ] ErrorResponseDto created
- [ ] Filters applied in correct order in main.ts
- [ ] Services updated to use custom exceptions
- [ ] Swagger documentation added
- [ ] All error scenarios tested
- [ ] Error logging works correctly
- [ ] Stack traces hidden in production
- [ ] Validation errors formatted correctly
- [ ] Prisma errors still handled properly

## Expected Outcomes

After implementation:
- Consistent error response format across all endpoints
- Detailed validation error messages
- Proper error logging with context
- Environment-aware error details (hide stack in prod)
- Type-safe custom exceptions
- Well-documented error responses in Swagger
- Better developer experience debugging issues

## References

- Current Prisma filter: `src/prisma/filters/prisma-known-error.filter.ts`
- Main bootstrap: `src/main.ts`
- NestJS exception filters: https://docs.nestjs.com/exception-filters
