import { INestApplicationContext, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { ConfigModule } from 'src/config/config.module';
import { ConfigService } from 'src/config/config.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserService } from 'src/user/user.service';

@Module({
  imports: [PrismaModule, ConfigModule, AuthModule],
  providers: [AuthService, UserService],
})
class SeederModule {}

async function init() {
  const appContext = await NestFactory.createApplicationContext(SeederModule);
  await createAdminUser(appContext);
}

async function createAdminUser(appContext: INestApplicationContext) {
  console.log(process.cwd);
  const configService = appContext.get(ConfigService);
  const defaultAdminUser = configService.defaultAdminUser;
  const userService = appContext.get(UserService);
  // TODO: figure out how to handle check is user exsisted
  try {
    const adminUser = await userService.getOneByEmail(defaultAdminUser.email);
    if (adminUser) throw new Error('User has been already exsisted');
  } catch {
    const authService = appContext.get(AuthService);
    authService.signUp(defaultAdminUser);
  }
}

init();
