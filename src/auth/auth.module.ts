import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from 'src/user/user.module';
import { ConfigService } from 'src/config/config.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  imports: [
    JwtModule.register({
      global: true,
      // eslint-disable-next-line
      secret: new ConfigService().jwtSecret,
      signOptions: { expiresIn: '60s' },
    }),
    UserModule,
  ],
})
export class AuthModule {}
