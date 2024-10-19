import { UserService } from 'src/user/user.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { UserDto } from './dto/user.dto';
import { UpdateUserDto } from './dto/update.user.dto';
import { IApiRequest } from 'src/common/interfaces/app-request.interface';

@Controller('user')
@ApiBearerAuth()
@ApiTags('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiConsumes('application/x-www-form-urlencoded')
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: IApiRequest) {
    const { user } = req;
    return plainToInstance(UserDto, await this.userService.getOneById(user.id));
  }

  @ApiConsumes('application/x-www-form-urlencoded')
  @Put('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(@Body() body: UpdateUserDto, @Req() { user }: IApiRequest) {
    return plainToInstance(
      UserDto,
      await this.userService.update(user.id, body),
    );
  }

  @ApiConsumes('application/x-www-form-urlencoded')
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  async deleteMe(@Req() { user }: IApiRequest) {
    return plainToInstance(UserDto, await this.userService.deleteOne(user.id));
  }

  @ApiConsumes('application/x-www-form-urlencoded')
  @Get(':userId')
  @UseGuards(JwtAuthGuard)
  async getUserById(@Param('userId') userId: string) {
    return plainToInstance(UserDto, await this.userService.getOneById(userId));
  }
}
