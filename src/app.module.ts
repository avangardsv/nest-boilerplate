import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
// import { LoggerModule } from './logger/logger.module';
import { ConfigModule } from './config/config.module';
import { CompanyModule } from './company/company.module';
import { ProjectModule } from './project/project.module';
import { TaskModule } from './task/task.module';

@Module({
  imports: [
    UserModule,
    AuthModule,
    PrismaModule,
    ConfigModule,
    CompanyModule,
    ProjectModule,
    TaskModule,
  ],
  controllers: [],
  providers: [JwtStrategy],
})
export class AppModule {}
