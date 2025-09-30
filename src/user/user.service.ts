import { Injectable, OnModuleInit } from '@nestjs/common';
import { User } from '@prisma/client';
import { AuthSignUpDto } from 'src/auth/dto/auth.sign-up.dto';
import {
	ADMIN_USER_EMAIL,
	ADMIN_USER_ID,
	ADMIN_USER_NAME,
	ADMIN_USER_PASSWORD,
} from 'src/common/constants/user.constants';
import { PrismaService } from 'src/prisma/prisma.service';
import {
	ADMIN_USER_EMAIL,
	ADMIN_USER_ID,
	ADMIN_USER_NAME,
	ADMIN_USER_PASSWORD,
} from 'src/common/constants/user.constants';

@Injectable()
export class UserService implements OnModuleInit {
	constructor(private readonly prismaService: PrismaService) {}
	async create(user: AuthSignUpDto): Promise<User> {
		return await this.prismaService.user.create({ data: user });
	}
	async update(id: string, user: Partial<User>) {
		return await this.prismaService.user.update({
			where: {
				id,
			},
			data: user,
		});
	}
	// async deleteUser(user: User) {
	//   return await this.updateUser(user, new Date());
	// }
	async getOneById(userId: string) {
		return await this.prismaService.user.findFirst({
			where: {
				id: userId,
			},
		});
	}
	async getOneByEmail(email: string) {
		return await this.prismaService.user.findFirst({
			where: {
				email,
			},
		});
	}
	async deleteOne(userId: string) {
		return this.update(userId, { deletedAt: new Date() });
	}

	async onModuleInit() {
		const adminData = {
			id: ADMIN_USER_ID,
			email: ADMIN_USER_EMAIL,
			password: ADMIN_USER_PASSWORD,
			name: ADMIN_USER_NAME,
			isAdmin: true,
		};

		const adminUser = await this.getOneByEmail(adminData.email);
		if (adminUser) return;
		return await this.create(adminData);
	}
}
