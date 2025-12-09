# Task: Implement Domain-Specific Exception Handling

## Context
The application needs a structured way to handle domain-specific exceptions that can be thrown from services and properly transformed into HTTP responses. This provides better error handling, consistent error responses, and separation of concerns.

## Current State
- Generic HttpException is used for all errors
- No domain-specific exception types
- Error responses are inconsistent
- No structured error codes

## Requirements

### 1. Create Domain Exception Class

Create `src/common/exceptions/domain.exception.ts`:

```typescript
import { HttpStatus } from '@nestjs/common';
import { ResponseCode } from '../interfaces/api-response.interface';
import { ApiResponseClass } from '../dto/api-response.dto';

export class DomainException<T = void> extends Error {
  readonly code: ResponseCode;
  readonly httpCode: HttpStatus;
  readonly message: string;
  readonly error?: unknown;
  readonly data?: T;

  constructor(
    code: ResponseCode,
    message?: string,
    httpCode?: HttpStatus,
    error?: unknown,
    data?: T,
  ) {
    super(message);
    this.name = 'DomainException';
    this.code = code;
    this.httpCode = httpCode || HttpStatus.BAD_REQUEST;
    this.message = message || 'An error occurred';
    this.error = error;
    this.data = data;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DomainException);
    }
  }

  toApiResponse(): ApiResponseClass<T> {
    return new ApiResponseClass({
      code: this.code,
      httpCode: this.httpCode,
      message: this.message,
      errorDetails: this.error,
      result: this.data,
    });
  }
}
```

### 2. Create Specific Exception Classes

Create `src/common/exceptions/not-found.exception.ts`:

```typescript
import { HttpStatus } from '@nestjs/common';
import { ResponseCode } from '../interfaces/api-response.interface';
import { DomainException } from './domain.exception';

export class NotFoundException extends DomainException {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier
      ? `${resource} with identifier ${identifier} not found`
      : `${resource} not found`;

    super(ResponseCode.NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }
}
```

Create `src/common/exceptions/unauthorized.exception.ts`:

```typescript
import { HttpStatus } from '@nestjs/common';
import { ResponseCode } from '../interfaces/api-response.interface';
import { DomainException } from './domain.exception';

export class UnauthorizedException extends DomainException {
  constructor(message = 'Unauthorized access') {
    super(ResponseCode.UNAUTHORIZED, message, HttpStatus.UNAUTHORIZED);
  }
}
```

Create `src/common/exceptions/forbidden.exception.ts`:

```typescript
import { HttpStatus } from '@nestjs/common';
import { ResponseCode } from '../interfaces/api-response.interface';
import { DomainException } from './domain.exception';

export class ForbiddenException extends DomainException {
  constructor(message = 'Access forbidden') {
    super(ResponseCode.FORBIDDEN, message, HttpStatus.FORBIDDEN);
  }
}
```

Create `src/common/exceptions/conflict.exception.ts`:

```typescript
import { HttpStatus } from '@nestjs/common';
import { ResponseCode } from '../interfaces/api-response.interface';
import { DomainException } from './domain.exception';

export class ConflictException extends DomainException {
  constructor(message: string, data?: unknown) {
    super(ResponseCode.BAD_REQUEST, message, HttpStatus.CONFLICT, undefined, data);
  }
}
```

### 3. Update Exception Filter

Update `src/common/filters/http-exception.filter.ts`:

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ResponseCode } from '../interfaces/api-response.interface';
import { ApiResponseClass } from '../dto/api-response.dto';
import { DomainException } from '../exceptions/domain.exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: DomainException | HttpException | Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // Handle DomainException
    if (exception instanceof DomainException) {
      const apiResponse = exception.toApiResponse();
      this.logger.warn(
        `DomainException: ${exception.message}`,
        {
          code: exception.code,
          httpCode: exception.httpCode,
          path: request.url,
          method: request.method,
        },
        'HttpExceptionFilter',
      );
      response.status(exception.httpCode).json(apiResponse);
      return;
    }

    // Handle HttpException
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let code = ResponseCode.GENERAL_ERROR;
      let message = 'An error occurred';
      let errorCode: string | undefined;
      let errorDetails: object | undefined;

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        errorCode = responseObj.errorCode;
        errorDetails = responseObj.errorDetails;
      } else {
        message = exception.message;
      }

      // Map HTTP status to response codes
      switch (status) {
        case HttpStatus.BAD_REQUEST:
          code = ResponseCode.BAD_REQUEST;
          break;
        case HttpStatus.UNAUTHORIZED:
          code = ResponseCode.UNAUTHORIZED;
          break;
        case HttpStatus.FORBIDDEN:
          code = ResponseCode.FORBIDDEN;
          break;
        case HttpStatus.NOT_FOUND:
          code = ResponseCode.NOT_FOUND;
          break;
        case HttpStatus.INTERNAL_SERVER_ERROR:
          code = ResponseCode.INTERNAL_SERVER_ERROR;
          break;
      }

      const apiResponse = new ApiResponseClass({
        code,
        httpCode: status,
        message,
        errorCode,
        errorDetails,
      });

      response.status(status).json(apiResponse);
      return;
    }

    // Handle unknown errors
    this.logger.error(
      `Unhandled exception: ${exception.message}`,
      exception.stack,
      'HttpExceptionFilter',
    );

    const apiResponse = new ApiResponseClass({
      code: ResponseCode.INTERNAL_SERVER_ERROR,
      httpCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(apiResponse);
  }
}
```

### 4. Update Response Code Enum

Update `src/common/interfaces/api-response.interface.ts`:

```typescript
export enum ResponseCode {
  OPERATION_SUCCESS = 'OPERATION_SUCCESS',
  GENERAL_ERROR = 'GENERAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}
```

### 5. Usage Examples

#### In Services

```typescript
import { Injectable } from '@nestjs/common';
import { NotFoundException } from '../common/exceptions/not-found.exception';
import { ConflictException } from '../common/exceptions/conflict.exception';

@Injectable()
export class TaskService {
  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException('Task', id);
    }

    return task;
  }

  async create(data: CreateTaskDto) {
    const existing = await this.prisma.task.findFirst({
      where: { name: data.name },
    });

    if (existing) {
      throw new ConflictException('Task with this name already exists');
    }

    return this.prisma.task.create({ data });
  }

  async update(id: string, data: UpdateTaskDto) {
    const task = await this.findOne(id); // Will throw NotFoundException if not found

    // Check for conflicts
    if (data.name) {
      const existing = await this.prisma.task.findFirst({
        where: { name: data.name, NOT: { id } },
      });

      if (existing) {
        throw new ConflictException('Task with this name already exists');
      }
    }

    return this.prisma.task.update({ where: { id }, data });
  }
}
```

#### In Guards

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '../common/exceptions/unauthorized.exception';
import { ForbiddenException } from '../common/exceptions/forbidden.exception';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!user.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
```

## Testing Requirements

Create tests for:
- [ ] DomainException creates correct ApiResponse
- [ ] NotFoundException has correct message and status
- [ ] UnauthorizedException has correct status
- [ ] ForbiddenException has correct status
- [ ] ConflictException includes data
- [ ] Exception filter handles DomainException correctly
- [ ] Exception filter handles HttpException correctly
- [ ] Exception filter handles unknown errors correctly

## Benefits

- Consistent error handling across the application
- Type-safe exception throwing
- Better error messages for clients
- Separation of domain logic from HTTP concerns
- Easy to extend with new exception types
- Proper HTTP status code mapping
- Structured error responses

## Best Practices

- Use specific exception types (NotFoundException, ConflictException, etc.)
- Provide meaningful error messages
- Include relevant data in exceptions when helpful
- Let the exception filter handle HTTP response transformation
- Log exceptions appropriately
- Don't expose internal error details in production

## References

- NestJS Exception Filters: https://docs.nestjs.com/exception-filters
- Error Handling Best Practices: https://www.rfc-editor.org/rfc/rfc7807

