import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Req,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { IApiRequest } from 'src/common/interfaces/app-request.interface';
import { CreateTaskDto } from './dto/create-task.dto';
import { TasksPaginationDto } from './dto/pagination/tasks.pagination.dto';
import { TasksPaginationOptionsDto } from './dto/pagination/tasks.pagination.options.dto';
import { TaskDto } from './dto/task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskService } from './task.service';

@Controller('task')
@ApiBearerAuth()
@ApiTags('task')
export class TaskController {
	constructor(private readonly taskService: TaskService) {}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Post('pagination')
	@UseGuards(JwtAuthGuard)
	async getTasks(
		@Req() req: IApiRequest,
		@Body() options: TasksPaginationOptionsDto,
	) {
		const { user } = req;
		const tasks = await this.taskService.getTasks(options, user);
		return plainToInstance(TasksPaginationDto, tasks, {
			excludeExtraneousValues: true,
		});
	}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Get(':taskId')
	@UseGuards(JwtAuthGuard)
	async getTask(
		@Param('taskId', ParseUUIDPipe) taskId: string,
		@Req() req: IApiRequest,
	) {
		const { user } = req;
		const task = await this.taskService.getTaskById(taskId, user);
		return plainToInstance(TaskDto, task, {
			excludeExtraneousValues: true,
		});
	}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Delete(':taskId')
	@UseGuards(JwtAuthGuard)
	async deleteTask(
		@Param('taskId', ParseUUIDPipe) taskId: string,
		@Req() req: IApiRequest,
	) {
		const { user } = req;
		const task = await this.taskService.updateTaskById(taskId, user, {
			deletedAt: new Date(),
		});
		return plainToInstance(TaskDto, task, {
			excludeExtraneousValues: true,
		});
	}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Patch(':taskId')
	@UseGuards(JwtAuthGuard)
	async updateTask(
		@Req() req: IApiRequest,
		@Body() dto: UpdateTaskDto,
		@Param('taskId', ParseUUIDPipe) taskId: string,
	) {
		const { user } = req;
		const task = await this.taskService.updateTaskById(taskId, user, dto);
		return plainToInstance(TaskDto, task, {
			excludeExtraneousValues: true,
		});
	}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Post()
	@UseGuards(JwtAuthGuard)
	async createTask(@Req() { user }: IApiRequest, @Body() dto: CreateTaskDto) {
		const task = await this.taskService.createTask(
			{ ...dto, reporterId: user.id },
			user,
		);
		return plainToInstance(TaskDto, task, {
			excludeExtraneousValues: true,
		});
	}
}
