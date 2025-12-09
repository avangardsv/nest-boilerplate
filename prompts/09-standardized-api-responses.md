# Task: Implement Standardized API Response Interceptor

## Context
Currently, API responses are returned in various formats without a consistent structure. We need a standardized response format that wraps all API responses consistently, making it easier for frontend clients to handle responses and providing better error handling.

## Current State
- Controllers return data directly without consistent structure
- No standardized error response format
- Swagger documentation doesn't show consistent response schemas
- Frontend must handle different response formats

## Requirements

### 1. Create Response Interfaces

Create `src/common/interfaces/api-response.interface.ts`:

```typescript
import { HttpStatus } from '@nestjs/common';

export enum ResponseCode {
  OPERATION_SUCCESS = 'OPERATION_SUCCESS',
  GENERAL_ERROR = 'GENERAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export interface IApiResponseDto<T = void> {
  code: ResponseCode;
  httpCode: HttpStatus;
  message?: string;
  result?: T;
  errorCode?: string;
  errorDetails?: object;
}

export interface IApiResponsePagination {
  total: number;
  limit: number;
  offset: number;
}

export interface IApiResponseWithCount<T = void> {
  pagination: IApiResponsePagination;
  data: T;
}
```

### 2. Create Response DTO Class

Create `src/common/dto/api-response.dto.ts`:

```typescript
import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiExtraModels, ApiProperty, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ResponseCode } from '../interfaces/api-response.interface';
import { plainToInstance } from 'class-transformer';

export class ApiResponseClass<T = void> {
  constructor(data?: Partial<ApiResponseClass<T>>) {
    if (data) {
      Object.assign(this, plainToInstance(ApiResponseClass, data));
    }
  }

  @ApiProperty({
    enum: ResponseCode,
    enumName: 'ResponseCode',
    example: ResponseCode.OPERATION_SUCCESS,
  })
  code: ResponseCode;

  @ApiProperty({
    enum: HttpStatus,
    enumName: 'HttpStatus',
  })
  httpCode: HttpStatus;

  @ApiProperty({
    required: false,
  })
  message?: string;

  @ApiProperty({
    required: false,
  })
  result?: T;

  @ApiProperty({
    required: false,
  })
  errorCode?: string;

  @ApiProperty({
    required: false,
  })
  errorDetails?: object;
}

class ApiResponseDtoAbstract<T> {
  @ApiProperty({
    enum: ResponseCode,
    enumName: 'ResponseCode',
    example: ResponseCode.OPERATION_SUCCESS,
  })
  code: ResponseCode;

  @ApiProperty({
    enum: HttpStatus,
    enumName: 'HttpStatus',
  })
  httpCode: HttpStatus;

  @ApiProperty({
    required: false,
  })
  message?: string;

  result?: T;
}

function getResult(model: Type): Record<string, string> {
  switch (model) {
    case Boolean:
      return { type: 'boolean' };
    case Number:
      return { type: 'number' };
    case String:
      return { type: 'string' };

    default:
      return {
        $ref: getSchemaPath(model),
      };
  }
}

export interface IApiResponseOptions {
  isArray?: boolean;
  statusCode?: number;
  description?: string;
}

export const ApiResponseDto = <TModel extends Type<any>>(
  model: TModel,
  options: IApiResponseOptions = {},
): (<TFunction extends Function, Y>(
  target: object | TFunction,
  propertyKey?: string | symbol,
  descriptor?: TypedPropertyDescriptor<Y>,
) => void) => {
  const { isArray, statusCode = 200, description } = options;
  const result = isArray
    ? {
        type: 'array',
        items: { $ref: getSchemaPath(model) },
      }
    : getResult(model);

  return applyDecorators(
    ApiExtraModels(model, ApiResponseDtoAbstract),
    ApiResponse({
      status: statusCode,
      schema: {
        title: `ResponseOf${model.name}`,
        description,
        allOf: [
          { $ref: getSchemaPath(ApiResponseDtoAbstract) },
          {
            properties: {
              httpCode: {
                example: statusCode,
              },
              result,
            },
          },
        ],
      },
    }),
  );
};
```

### 3. Create Response Interceptor

Create `src/common/interceptors/response.interceptor.ts`:

```typescript
import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseClass } from '../dto/api-response.dto';
import { ResponseCode } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  public intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const statusCode =
      context.switchToHttp().getResponse<ExpressResponse>().statusCode ?? HttpStatus.OK;

    return next.handle().pipe(
      map((responseData: any): ApiResponseClass<any> => {
        // If the response is already an ApiResponseClass, return it as is
        if (responseData?.httpCode && responseData?.code) {
          return responseData;
        }

        // Wrap successful responses in ApiResponseClass
        return new ApiResponseClass({
          code: ResponseCode.OPERATION_SUCCESS,
          httpCode: statusCode,
          result: responseData,
        });
      }),
    );
  }
}
```

### 4. Create Validation Error Transformer

Create `src/common/helpers/validation-error.transformer.ts`:

```typescript
import { HttpStatus } from '@nestjs/common';
import { ResponseCode } from '../interfaces/api-response.interface';
import { ApiResponseClass } from '../dto/api-response.dto';
import { ValidationError } from 'class-validator';

export const validationErrorTransformer = (
  errors: ValidationError[],
): ApiResponseClass => {
  const list: string[] = [];
  
  for (const error of errors) {
    const messages = Object.values(error?.constraints || {});
    error.children.forEach(({ constraints }) =>
      list.push(...Object.values(constraints || {})),
    );
    list.push(...messages);
  }

  return new ApiResponseClass({
    code: ResponseCode.VALIDATION_ERROR,
    message: list.join(', '),
    httpCode: HttpStatus.BAD_REQUEST,
  });
};
```

### 5. Update Global Exception Filter

Update `src/common/filters/http-exception.filter.ts` to use ApiResponseClass:

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

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException | Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = ResponseCode.GENERAL_ERROR;
    let message = 'Internal server error';
    let errorCode: string | undefined;
    let errorDetails: object | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

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
    } else {
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
        'HttpExceptionFilter',
      );
    }

    const apiResponse = new ApiResponseClass({
      code,
      httpCode: status,
      message,
      errorCode,
      errorDetails,
    });

    response.status(status).json(apiResponse);
  }
}
```

### 6. Update main.ts

Update `src/main.ts` to use the interceptor and updated validation pipe:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { validationErrorTransformer } from './common/helpers/validation-error.transformer';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global response interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global validation pipe with custom error transformer
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => validationErrorTransformer(errors),
    }),
  );

  // ... rest of bootstrap
}
```

### 7. Update Controllers to Use Decorators

Example controller update:

```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { TaskDto } from './dto/task.dto';

@ApiTags('tasks')
@Controller('tasks')
export class TaskController {
  @Get()
  @ApiOperation({ summary: 'Get all tasks' })
  @ApiResponseDto(TaskDto, { isArray: true })
  async findAll() {
    // Return data directly, interceptor will wrap it
    return this.taskService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a task' })
  @ApiResponseDto(TaskDto, { statusCode: 201 })
  async create(@Body() createTaskDto: CreateTaskDto) {
    return this.taskService.create(createTaskDto);
  }
}
```

## Expected Response Format

### Success Response
```json
{
  "code": "OPERATION_SUCCESS",
  "httpCode": 200,
  "result": {
    "id": "uuid",
    "name": "Task name",
    "status": "pending"
  }
}
```

### Error Response
```json
{
  "code": "BAD_REQUEST",
  "httpCode": 400,
  "message": "Validation failed",
  "errorCode": "VALIDATION_ERROR"
}
```

### Paginated Response
```json
{
  "code": "OPERATION_SUCCESS",
  "httpCode": 200,
  "result": {
    "pagination": {
      "total": 100,
      "limit": 10,
      "offset": 0
    },
    "data": [...]
  }
}
```

## Testing Requirements

Create tests for:
- [ ] Response interceptor wraps data correctly
- [ ] Response interceptor preserves existing ApiResponseClass
- [ ] Validation errors are transformed correctly
- [ ] Exception filter handles HttpException correctly
- [ ] Exception filter handles unknown errors correctly
- [ ] Swagger decorators generate correct schemas

## Benefits

- Consistent API response format across all endpoints
- Better error handling and debugging
- Improved Swagger documentation
- Easier frontend integration
- Standardized error codes for client-side handling
- Better type safety with TypeScript

## References

- NestJS Interceptors: https://docs.nestjs.com/interceptors
- NestJS Exception Filters: https://docs.nestjs.com/exception-filters
- Swagger Decorators: https://docs.nestjs.com/openapi/decorators

