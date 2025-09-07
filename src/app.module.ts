import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
// import { LoggerModule } from './logger/logger.module';
import { ConfigModule } from './config/config.module';
import { CompanyModule } from './company/company.module';
import { SeederModule } from './seeder/seeder.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [UserModule, AuthModule, PrismaModule, ConfigModule, CompanyModule, SeederModule, SeedModule],
  controllers: [],
  providers: [JwtStrategy],
})
export class AppModule {}
