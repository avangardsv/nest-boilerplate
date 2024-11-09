import { JwtAuthGuard } from './../auth/guards/jwt-auth.guard';
import { UserService } from 'src/user/user.service';
import { Body, Controller, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { IsAdminGuard } from 'src/auth/guards/is-admin.guard';
import { UserDto } from './dto/user.dto';
import { plainToInstance } from 'class-transformer';
import { AdminUpdateUserDto } from './dto/admin.update.user.dto';

@Controller('user')
@ApiTags('admin user')
@ApiBearerAuth()
export class UserAdminController {
  constructor(private readonly userService: UserService) {}

  @ApiConsumes('application/x-www-form-urlencoded')
  @Put(':userId')
  @UseGuards(JwtAuthGuard, new IsAdminGuard())
  async update(
    @Body() user: AdminUpdateUserDto,
    @Param('userId') userId: string,
  ) {
    return plainToInstance(
      UserDto,
      await this.userService.update(userId, user),
    );
  }
}
