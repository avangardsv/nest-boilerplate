import { Module } from '@nestjs/common';

import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserAdminController } from './user-admin.controller';

@Module({
	controllers: [UserController, UserAdminController],
	providers: [UserService],
	exports: [UserService],
})
export class UserModule {}
