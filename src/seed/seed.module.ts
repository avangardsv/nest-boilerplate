import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';
import { CompanyService } from 'src/company/company.service';

@Module({
  providers: [SeedService],
})
export class SeedModule {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
    private readonly companyService: CompanyService,
  ) {}

  async deleteAll() {
    await this.prismaService.user.deleteMany({});
    await this.prismaService.company.deleteMany({});
    await this.prismaService.project.deleteMany({});
    await this.prismaService.task.deleteMany({});
    await this.prismaService.status.deleteMany({});
    await this.prismaService.priority.deleteMany({});
    await this.prismaService.task.deleteMany({});
    await this.prismaService.task.deleteMany({});
  }

  async run() {
    await this.deleteAll();

    const user = await this.userService.create({
      email: 'admin@admin.com',
      password: 'admin',
      name: 'Admin',
    });

    const company = await this.prismaService.company.create({
      data: {
        name: 'Admin',
        ownerId: user.id,
      },
    });

    
  }
}
