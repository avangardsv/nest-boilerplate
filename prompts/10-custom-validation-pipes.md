# Task: Implement Custom Validation Pipes

## Context
The application needs custom validation pipes to handle common validation scenarios that aren't covered by standard class-validator decorators. These pipes will normalize query parameters, validate positive integers, and handle file uploads with proper validation.

## Current State
- Basic ValidationPipe is used globally
- Query parameters with array syntax (`param[]`) are not normalized
- No validation for positive integers
- No file upload validation

## Requirements

### 1. Normalize Query Parameters Array Pipe

Create `src/common/pipes/normalize-query-params-array.pipe.ts`:

```typescript
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

// Define which query parameters should be treated as arrays
const QUERY_ARRAY_KEYS = ['sort', 'sort[]', 'categoryIds', 'categoryIds[]', 'tags', 'tags[]'];

@Injectable()
export class NormalizeQueryParamsArrayPipe implements PipeTransform {
  transform(value: Record<string, unknown>, _metadata: ArgumentMetadata): Record<string, unknown> {
    if (!value || typeof value !== 'object') {
      return value;
    }

    // Get unique base keys (without [])
    const baseKeys = [...new Set(QUERY_ARRAY_KEYS.map((key) => key.replace('[]', '')))];

    // Process each base key
    for (const baseKey of baseKeys) {
      const arrayKey = `${baseKey}[]`;
      const mergedValues: string[] = [];

      // Handle base key (e.g., 'sort', 'categoryIds')
      if (typeof value[baseKey] !== 'undefined') {
        if (Array.isArray(value[baseKey])) {
          for (const item of value[baseKey] as unknown[]) {
            if (typeof item === 'string') mergedValues.push(item);
          }
        } else if (typeof value[baseKey] === 'string') {
          mergedValues.push(value[baseKey]);
        }
      }

      // Handle array key (e.g., 'sort[]', 'categoryIds[]')
      if (typeof value[arrayKey] !== 'undefined') {
        if (Array.isArray(value[arrayKey])) {
          for (const item of value[arrayKey] as unknown[]) {
            if (typeof item === 'string') mergedValues.push(item);
          }
        } else if (typeof value[arrayKey] === 'string') {
          mergedValues.push(value[arrayKey]);
        }
      }

      // Set the merged values if any exist
      if (mergedValues.length > 0) {
        value[baseKey] = mergedValues;
      }

      // Remove the array key to avoid confusion
      delete value[arrayKey];
    }

    return value;
  }
}
```

### 2. Parse Positive Integer Pipe

Create `src/common/pipes/parse-positive-int.pipe.ts`:

```typescript
import {
  ParseIntPipe,
  ArgumentMetadata,
  BadRequestException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class ParsePositiveIntPipe extends ParseIntPipe {
  async transform(value: string, metadata: ArgumentMetadata): Promise<number> {
    const intValue = await super.transform(value, metadata);

    if (intValue <= 0) {
      throw new BadRequestException(
        `Validation failed (${metadata.data} must be a positive number)`,
      );
    }

    return intValue;
  }
}
```

### 3. File Upload Validation Pipe (Optional - for future use)

Create `src/common/pipes/file-validation.pipe.ts`:

```typescript
import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

export interface IFileValidationOptions {
  maxSizeInMB?: number;
  allowedMimeTypes?: string[];
  isOptional?: boolean;
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private readonly options: IFileValidationOptions = {}) {
    this.options = {
      maxSizeInMB: options.maxSizeInMB || 5,
      allowedMimeTypes: options.allowedMimeTypes || ['image/jpeg', 'image/png', 'image/webp'],
      isOptional: options.isOptional || false,
    };
  }

  async transform(file: Express.Multer.File, _metadata: ArgumentMetadata): Promise<Express.Multer.File> {
    // File is optional
    if (!file) {
      if (this.options.isOptional) {
        return file;
      }
      throw new BadRequestException('File is required');
    }

    // Validate file size
    const maxSizeInBytes = this.options.maxSizeInMB! * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      throw new BadRequestException(
        `File size exceeds the maximum allowed size of ${this.options.maxSizeInMB}MB`,
      );
    }

    // Validate MIME type
    if (!this.options.allowedMimeTypes!.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed types: ${this.options.allowedMimeTypes!.join(', ')}`,
      );
    }

    return file;
  }
}
```

### 4. Update main.ts

Update `src/main.ts` to include the normalize pipe:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NormalizeQueryParamsArrayPipe } from './common/pipes/normalize-query-params-array.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new NormalizeQueryParamsArrayPipe(),
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ... rest of bootstrap
}
```

### 5. Usage Examples

#### In Controllers - Query Parameters

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { NormalizeQueryParamsArrayPipe } from '../common/pipes/normalize-query-params-array.pipe';

@Controller('tasks')
export class TaskController {
  @Get()
  async findAll(
    @Query(NormalizeQueryParamsArrayPipe) query: {
      sort?: string[];
      categoryIds?: string[];
    },
  ) {
    // Now sort and categoryIds are always arrays if provided
    // Supports both: ?sort=name&sort=date and ?sort[]=name&sort[]=date
    return this.taskService.findAll(query);
  }
}
```

#### In Controllers - Route Parameters

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { ParsePositiveIntPipe } from '../common/pipes/parse-positive-int.pipe';

@Controller('tasks')
export class TaskController {
  @Get(':id')
  async findOne(@Param('id', ParsePositiveIntPipe) id: number) {
    // id is guaranteed to be a positive integer
    return this.taskService.findOne(id);
  }
}
```

#### In Controllers - File Uploads

```typescript
import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from '../common/pipes/file-validation.pipe';

@Controller('upload')
export class UploadController {
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile(
      new FileValidationPipe({
        maxSizeInMB: 2,
        allowedMimeTypes: ['image/jpeg', 'image/png'],
      }),
    )
    file: Express.Multer.File,
  ) {
    return { url: await this.uploadService.upload(file) };
  }
}
```

## Testing Requirements

Create tests for:
- [ ] NormalizeQueryParamsArrayPipe handles single values
- [ ] NormalizeQueryParamsArrayPipe handles array values
- [ ] NormalizeQueryParamsArrayPipe handles mixed syntax
- [ ] ParsePositiveIntPipe accepts positive integers
- [ ] ParsePositiveIntPipe rejects zero and negative numbers
- [ ] ParsePositiveIntPipe rejects non-numeric strings
- [ ] FileValidationPipe validates file size
- [ ] FileValidationPipe validates MIME types
- [ ] FileValidationPipe handles optional files

## Benefits

- Consistent query parameter handling
- Type-safe route parameters
- Better validation for file uploads
- Reduced boilerplate in controllers
- Improved developer experience
- Better error messages

## Notes

- The `QUERY_ARRAY_KEYS` array should be customized based on your application's needs
- File validation pipe can be extended with image dimension validation using libraries like `sharp`
- Consider creating a configuration service to manage allowed file types and sizes

## References

- NestJS Pipes: https://docs.nestjs.com/pipes
- class-validator: https://github.com/typestack/class-validator
- Express Multer: https://github.com/expressjs/multer

