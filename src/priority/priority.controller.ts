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
import { CreatePriorityDto } from './dto/create-priority.dto';
import { PrioritiesPaginationDto } from './dto/pagination/priorities.pagination.dto';
import { PrioritiesPaginationOptionsDto } from './dto/pagination/priorities.pagination.options.dto';
import { PriorityDto } from './dto/priority.dto';
import { UpdatePriorityDto } from './dto/update-priority.dto';
import { PriorityService } from './priority.service';

@Controller('priority')
@ApiBearerAuth()
@ApiTags('priority')
export class PriorityController {
	constructor(private readonly priorityService: PriorityService) {}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Post('pagination')
	@UseGuards(JwtAuthGuard)
	async getPriorities(@Body() options: PrioritiesPaginationOptionsDto) {
		const priorities = await this.priorityService.getPriorities(options);
		return plainToInstance(PrioritiesPaginationDto, priorities, {
			excludeExtraneousValues: true,
		});
	}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Get(':priorityId')
	@UseGuards(JwtAuthGuard)
	async getPriority(@Param('priorityId', ParseUUIDPipe) priorityId: string) {
		const priority = await this.priorityService.getPriorityById(priorityId);
		return plainToInstance(PriorityDto, priority, {
			excludeExtraneousValues: true,
		});
	}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Delete(':priorityId')
	@UseGuards(JwtAuthGuard, IsAdminGuard)
	async deletePriority(@Param('priorityId', ParseUUIDPipe) priorityId: string) {
		const priority = await this.priorityService.deletePriorityById(priorityId);
		return plainToInstance(PriorityDto, priority, {
			excludeExtraneousValues: true,
		});
	}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Patch(':priorityId')
	@UseGuards(JwtAuthGuard, IsAdminGuard)
	async updatePriority(
		@Body() dto: UpdatePriorityDto,
		@Param('priorityId', ParseUUIDPipe) priorityId: string,
	) {
		const priority = await this.priorityService.updatePriorityById(
			priorityId,
			dto,
		);
		return plainToInstance(PriorityDto, priority, {
			excludeExtraneousValues: true,
		});
	}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Post()
	@UseGuards(JwtAuthGuard, IsAdminGuard)
	async createPriority(@Body() dto: CreatePriorityDto) {
		const priority = await this.priorityService.createPriority(dto);
		return plainToInstance(PriorityDto, priority, {
			excludeExtraneousValues: true,
		});
	}
}
