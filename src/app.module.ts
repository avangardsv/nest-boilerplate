import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { CompanyModule } from './company/company.module';
// import { LoggerModule } from './logger/logger.module';
import { ConfigModule } from './config/config.module';
import { PriorityModule } from './priority/priority.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectModule } from './project/project.module';
import { StatusModule } from './status/status.module';
import { TaskModule } from './task/task.module';
import { UserModule } from './user/user.module';

@Module({
	imports: [
		UserModule,
		AuthModule,
		PrismaModule,
		ConfigModule,
		CompanyModule,
		ProjectModule,
		TaskModule,
		StatusModule,
		PriorityModule,
	],
	controllers: [],
	providers: [JwtStrategy],
})
export class AppModule {}
