import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { IsAdminGuard } from 'src/auth/guards/is-admin.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateStatusDto } from './dto/create-status.dto';
import { StatusesPaginationDto } from './dto/pagination/statuses.pagination.dto';
import { StatusesPaginationOptionsDto } from './dto/pagination/statuses.pagination.options.dto';
import { StatusDto } from './dto/status.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { StatusService } from './status.service';

@Controller('status')
@ApiBearerAuth()
@ApiTags('status')
export class StatusController {
	constructor(private readonly statusService: StatusService) {}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Post('pagination')
	@UseGuards(JwtAuthGuard)
	async getStatuses(@Body() options: StatusesPaginationOptionsDto) {
		const statuses = await this.statusService.getStatuses(options);
		return plainToInstance(StatusesPaginationDto, statuses, {
			excludeExtraneousValues: true,
		});
	}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Get(':statusId')
	@UseGuards(JwtAuthGuard)
	async getStatus(@Param('statusId', ParseUUIDPipe) statusId: string) {
		const status = await this.statusService.getStatusById(statusId);
		return plainToInstance(StatusDto, status, {
			excludeExtraneousValues: true,
		});
	}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Delete(':statusId')
	@UseGuards(JwtAuthGuard, IsAdminGuard)
	async deleteStatus(@Param('statusId', ParseUUIDPipe) statusId: string) {
		const status = await this.statusService.deleteStatusById(statusId);
		return plainToInstance(StatusDto, status, {
			excludeExtraneousValues: true,
		});
	}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Patch(':statusId')
	@UseGuards(JwtAuthGuard, IsAdminGuard)
	async updateStatus(
		@Body() dto: UpdateStatusDto,
		@Param('statusId', ParseUUIDPipe) statusId: string,
	) {
		const status = await this.statusService.updateStatusById(statusId, dto);
		return plainToInstance(StatusDto, status, {
			excludeExtraneousValues: true,
		});
	}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Post()
	@UseGuards(JwtAuthGuard, IsAdminGuard)
	async createStatus(@Body() dto: CreateStatusDto) {
		const status = await this.statusService.createStatus(dto);
		return plainToInstance(StatusDto, status, {
			excludeExtraneousValues: true,
		});
	}
}
