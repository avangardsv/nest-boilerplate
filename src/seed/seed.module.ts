import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { UserService } from 'src/user/user.service';

@Module({
  providers: [SeedService],
})
export class SeedModule {
  constructor(
    private readonly userService: UserService,
  ) {}

  async run() {
    await this.userService.create({
      email: 'admin@admin.com',
      password: 'admin',
      name: 'Admin',
    });
    
  }
}
