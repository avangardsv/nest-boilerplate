# Task: Implement Refresh Token Logic

## Context
The application currently has a placeholder for refresh token functionality that throws `NotImplementedException`. We need to implement a complete refresh token system that allows users to obtain new access tokens without re-authenticating, improving security and user experience.

## Current State
- `POST /auth/refresh` endpoint throws `NotImplementedException`
- JWT tokens are generated but refresh tokens are not stored or validated
- No token rotation or invalidation mechanism
- No refresh token storage in database

## Requirements

### 1. Update Prisma Schema

Add refresh token table to `prisma/schema.prisma`:

```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())
  revokedAt DateTime?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
  @@map("refresh_tokens")
}

model User {
  // ... existing fields
  refreshTokens RefreshToken[]
}
```

Run migration:
```bash
npx prisma migrate dev --name add_refresh_tokens
```

### 2. Create Refresh Token Service

Create `src/auth/services/refresh-token.service.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '../../config/config.service';
import { randomBytes } from 'crypto';

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate a secure random refresh token
   */
  private generateToken(): string {
    return randomBytes(64).toString('hex');
  }

  /**
   * Create a refresh token for a user
   */
  async createRefreshToken(userId: string): Promise<string> {
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Validate and retrieve refresh token
   */
  async validateRefreshToken(token: string): Promise<{ userId: string; tokenId: string }> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (refreshToken.revokedAt) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (refreshToken.expiresAt < new Date()) {
      // Clean up expired token
      await this.prisma.refreshToken.delete({
        where: { id: refreshToken.id },
      });
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (!refreshToken.user || refreshToken.user.deletedAt) {
      throw new UnauthorizedException('User no longer exists');
    }

    return {
      userId: refreshToken.userId,
      tokenId: refreshToken.id,
    };
  }

  /**
   * Revoke a refresh token
   */
  async revokeToken(token: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        token,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Rotate refresh token (invalidate old, create new)
   */
  async rotateToken(oldToken: string, userId: string): Promise<string> {
    // Revoke old token
    await this.revokeToken(oldToken);

    // Create new token
    return this.createRefreshToken(userId);
  }

  /**
   * Clean up expired tokens (for cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }
}
```

### 3. Update Auth Service

Update `src/auth/auth.service.ts`:

```typescript
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { hash, compare } from 'bcrypt';
import { JwtUserInfo } from 'src/common/types/jwt-user-info.type';
import { ConfigService } from 'src/config/config.service';
import { UserService } from 'src/user/user.service';
import { PrismaService } from './../prisma/prisma.service';
import { AuthSignInDto } from './dto/auth.sign-in.dto';
import { AuthSignUpDto } from './dto/auth.sign-up.dto';
import { RefreshTokenService } from './services/refresh-token.service';

@Injectable()
export class AuthService {
  constructor(
    readonly _prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  generateJwtPair(user: User) {
    const { id, name, isAdmin } = user;
    const payload: JwtUserInfo = { id, name, isAdmin };
    const accessTokenOptions: JwtSignOptions = {
      expiresIn: this.configService.jwtExpiresIn || '15m',
    };

    return {
      accessToken: this.jwtService.sign(payload, accessTokenOptions),
    };
  }

  async signUp(data: AuthSignUpDto) {
    const passwordHash = await hash(
      data.password,
      this.configService.passwordSaltRounds,
    );

    const user = await this.userService.create({
      ...data,
      password: passwordHash,
    });

    const tokens = this.generateJwtPair(user);
    const refreshToken = await this.refreshTokenService.createRefreshToken(user.id);

    return {
      ...tokens,
      refreshToken,
    };
  }

  async signIn(data: AuthSignInDto) {
    const user = await this.userService.getOneByEmail(data.email);
    
    if (!user) {
      throw new NotFoundException('Invalid credentials');
    }

    if (user.deletedAt) {
      throw new NotFoundException('Invalid credentials');
    }

    // Fix: Use compare instead of hashing again
    const isPasswordValid = await compare(data.password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.generateJwtPair(user);
    const refreshToken = await this.refreshTokenService.createRefreshToken(user.id);

    return {
      ...tokens,
      refreshToken,
    };
  }

  async refreshToken(refreshToken: string) {
    const { userId, tokenId } = await this.refreshTokenService.validateRefreshToken(refreshToken);

    const user = await this.userService.getOneById(userId);
    
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User no longer exists');
    }

    // Rotate refresh token for security
    const newRefreshToken = await this.refreshTokenService.rotateToken(refreshToken, userId);

    // Generate new access token
    const tokens = this.generateJwtPair(user);

    return {
      ...tokens,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokenService.revokeToken(refreshToken);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenService.revokeAllUserTokens(userId);
  }
}
```

### 4. Create Refresh Token DTOs

Create `src/auth/dto/refresh-token.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'abc123...',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
```

### 5. Update Auth Controller

Update `src/auth/auth.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiConsumes, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthSignInDto } from './dto/auth.sign-in.dto';
import { AuthSignUpDto } from './dto/auth.sign-up.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('authorization')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiOperation({ summary: 'Sign in with email and password' })
  @Post('signin')
  signIn(@Body() data: AuthSignInDto) {
    return this.authService.signIn(data);
  }

  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiOperation({ summary: 'Sign up with email and password' })
  @Post('signup')
  signUp(@Body() data: AuthSignUpDto) {
    return this.authService.signUp(data);
  }

  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: 200,
    description: 'New access and refresh tokens',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out',
  })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body: RefreshTokenDto) {
    await this.authService.logout(body.refreshToken);
    return { message: 'Successfully logged out' };
  }

  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out from all devices',
  })
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@Body() body: { userId: string }) {
    await this.authService.logoutAll(body.userId);
    return { message: 'Successfully logged out from all devices' };
  }
}
```

### 6. Update Auth Module

Update `src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from 'src/config/config.service';
import { UserModule } from 'src/user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './services/refresh-token.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenService],
  imports: [
    JwtModule.register({
      global: true,
      secret: new ConfigService().jwtSecret,
      signOptions: { expiresIn: '15m' },
    }),
    UserModule,
  ],
  exports: [AuthService, RefreshTokenService],
})
export class AuthModule {}
```

### 7. Update Config Service

Update `src/config/config.service.ts` to include refresh token configuration:

```typescript
// ... existing code

get jwtRefreshExpiresIn(): string {
  return this.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');
}

get refreshTokenExpiryDays(): number {
  return parseInt(this.get<string>('REFRESH_TOKEN_EXPIRY_DAYS', '30'), 10);
}
```

## Security Considerations

1. **Token Rotation**: Refresh tokens are rotated on each use to prevent token reuse attacks
2. **Expiration**: Refresh tokens expire after 30 days (configurable)
3. **Revocation**: Tokens can be revoked individually or all at once
4. **Storage**: Refresh tokens are stored securely in the database
5. **Cleanup**: Expired tokens should be cleaned up periodically (cron job)

## Testing Requirements

Create tests for:
- [ ] Refresh token creation on sign in/sign up
- [ ] Valid refresh token returns new tokens
- [ ] Invalid refresh token throws error
- [ ] Expired refresh token throws error
- [ ] Revoked refresh token throws error
- [ ] Token rotation creates new refresh token
- [ ] Logout revokes refresh token
- [ ] Logout all revokes all user tokens
- [ ] Expired tokens are cleaned up

## Usage Flow

1. **Sign In/Sign Up**: User receives `accessToken` and `refreshToken`
2. **Access Token Expires**: Client uses `refreshToken` to get new tokens
3. **Token Refresh**: Server validates refresh token, rotates it, returns new tokens
4. **Logout**: Client calls logout endpoint to revoke refresh token

## Benefits

- Improved security with token rotation
- Better user experience (no re-authentication needed)
- Ability to revoke tokens
- Support for "logout from all devices"
- Configurable token expiration

## References

- OAuth 2.0 Refresh Token Flow: https://oauth.net/2/refresh-tokens/
- JWT Best Practices: https://datatracker.ietf.org/doc/html/rfc8725

