# Task: Implement File Upload Handling

## Context
The application needs to handle file uploads for user avatars, task attachments, and project documents. This includes validation, storage, and serving uploaded files.

## Current State
- No file upload functionality
- No file storage configured
- No file validation

## Requirements

### 1. Install Required Dependencies

```bash
yarn add @nestjs/platform-express multer
yarn add -D @types/multer
```

### 2. Create File Upload Configuration

Create `src/common/config/multer.config.ts`:

```typescript
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const multerConfig: MulterOptions = {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  },
};
```

### 3. Create File Upload Service

Create `src/upload/upload.service.ts`:

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File, userId: string, type: 'avatar' | 'attachment'): Promise<string> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const fileUrl = `/uploads/${file.filename}`;

    // Save file metadata to database
    await this.prisma.file.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: fileUrl,
        userId,
        type,
      },
    });

    return fileUrl;
  }

  async deleteFile(fileId: string): Promise<void> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new BadRequestException('File not found');
    }

    // Delete physical file
    const filePath = path.join(process.cwd(), 'uploads', file.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete database record
    await this.prisma.file.delete({
      where: { id: fileId },
    });
  }

  getFileUrl(filename: string): string {
    return `${this.configService.appUrl || 'http://localhost:3000'}/uploads/${filename}`;
  }
}
```

### 4. Update Prisma Schema

Add File model to `prisma/schema.prisma`:

```prisma
model File {
  id           String   @id @default(uuid())
  filename     String
  originalName String
  mimeType     String
  size         Int
  url          String
  userId       String
  type         String   // 'avatar' | 'attachment'
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("files")
}

model User {
  // ... existing fields
  files File[]
}
```

### 5. Create Upload Controller

Create `src/upload/upload.controller.ts`:

```typescript
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { multerConfig } from '../common/config/multer.config';

@ApiTags('upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string },
  ) {
    const url = await this.uploadService.saveFile(file, user.id, 'avatar');

    // Update user avatar URL
    await this.uploadService.updateUserAvatar(user.id, url);

    return { url };
  }

  @Post('attachment')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({ summary: 'Upload file attachment' })
  @ApiConsumes('multipart/form-data')
  async uploadAttachment(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string },
  ) {
    const url = await this.uploadService.saveFile(file, user.id, 'attachment');
    return { url };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete uploaded file' })
  async deleteFile(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    await this.uploadService.deleteFile(id, user.id);
    return { message: 'File deleted successfully' };
  }
}
```

### 6. Create Current User Decorator

Create `src/common/decorators/current-user.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

### 7. Serve Static Files

Update `src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static files
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // ... rest of bootstrap
}
```

### 8. Create Upload Module

Create `src/upload/upload.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
```

### 9. Image Validation Pipe (Enhanced)

Update `src/common/pipes/file-validation.pipe.ts` from prompt 10 to support images:

```typescript
import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import * as sharp from 'sharp';

export interface IImageValidationOptions {
  maxSizeInMB?: number;
  allowedMimeTypes?: string[];
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  isOptional?: boolean;
}

@Injectable()
export class ImageValidationPipe implements PipeTransform {
  constructor(private readonly options: IImageValidationOptions = {}) {
    this.options = {
      maxSizeInMB: options.maxSizeInMB || 5,
      allowedMimeTypes: options.allowedMimeTypes || ['image/jpeg', 'image/png', 'image/webp'],
      isOptional: options.isOptional || false,
    };
  }

  async transform(file: Express.Multer.File, _metadata: ArgumentMetadata): Promise<Express.Multer.File> {
    if (!file) {
      if (this.options.isOptional) {
        return file;
      }
      throw new BadRequestException('Image file is required');
    }

    // Validate file size
    const maxSizeInBytes = this.options.maxSizeInMB! * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      throw new BadRequestException(
        `Image file size exceeds the maximum allowed size of ${this.options.maxSizeInMB}MB`,
      );
    }

    // Validate image dimensions using Sharp
    try {
      const imageInfo = await sharp(file.buffer).metadata();

      if (this.options.minWidth && imageInfo.width && imageInfo.width < this.options.minWidth) {
        throw new BadRequestException(
          `Image width must be at least ${this.options.minWidth}px`,
        );
      }

      if (this.options.maxWidth && imageInfo.width && imageInfo.width > this.options.maxWidth) {
        throw new BadRequestException(
          `Image width must be at most ${this.options.maxWidth}px`,
        );
      }

      if (this.options.minHeight && imageInfo.height && imageInfo.height < this.options.minHeight) {
        throw new BadRequestException(
          `Image height must be at least ${this.options.minHeight}px`,
        );
      }

      if (this.options.maxHeight && imageInfo.height && imageInfo.height > this.options.maxHeight) {
        throw new BadRequestException(
          `Image height must be at most ${this.options.maxHeight}px`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid image file');
    }

    return file;
  }
}
```

## Testing Requirements

Create tests for:
- [ ] File upload succeeds with valid file
- [ ] File upload fails with invalid file type
- [ ] File upload fails with file too large
- [ ] File deletion works correctly
- [ ] File metadata is saved to database
- [ ] Static files are served correctly

## Production Considerations

1. **Cloud Storage**: Use S3, Cloudinary, or similar for production
2. **CDN**: Serve files through CDN
3. **Virus Scanning**: Scan uploaded files
4. **Rate Limiting**: Limit upload frequency
5. **File Cleanup**: Clean up orphaned files

## Benefits

- User avatar uploads
- Task attachments
- Document management
- File validation
- Secure file storage

## References

- NestJS File Upload: https://docs.nestjs.com/techniques/file-upload
- Multer: https://github.com/expressjs/multer

