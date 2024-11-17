import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { AuthSignUpDto } from 'src/auth/dto/auth.sign-up.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}
  async create(user: AuthSignUpDto) {
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
}
