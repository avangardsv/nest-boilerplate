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
import { IApiRequest } from 'src/common/interfaces/app-request.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ProjectService } from './project.service';
import { plainToInstance } from 'class-transformer';
import { ProjectDto } from './dto/project.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsPaginationOptionsDto } from './dto/pagination/projects.pagination.options.dto';
import { ProjectsPaginationDto } from './dto/pagination/projects.pagination.dto';

@Controller('project')
@ApiBearerAuth()
@ApiTags('project')
export class ProjectController {
	constructor(private readonly projectService: ProjectService) {}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Post('pagination')
	@UseGuards(JwtAuthGuard)
	async getProjects(
		@Req() req: IApiRequest,
		@Body() options: ProjectsPaginationOptionsDto,
	) {
		const { user } = req;
		const projects = await this.projectService.getProjects(options, user);
		return plainToInstance(ProjectsPaginationDto, projects, {
			excludeExtraneousValues: true,
		});
	}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Get(':projectId')
	@UseGuards(JwtAuthGuard)
	async getProject(
		@Param('projectId', ParseUUIDPipe) projectId: string,
		@Req() req: IApiRequest,
	) {
		const { user } = req;
		const project = await this.projectService.getProjectById(projectId, user);
		return plainToInstance(ProjectDto, project, {
			excludeExtraneousValues: true,
		});
	}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Delete(':projectId')
	@UseGuards(JwtAuthGuard)
	async deleteProject(
		@Param('projectId', ParseUUIDPipe) projectId: string,
		@Req() req: IApiRequest,
	) {
		const { user } = req;
		const project = await this.projectService.updateProjectById(
			projectId,
			user,
			{
				deletedAt: new Date(),
			},
		);
		return plainToInstance(ProjectDto, project, {
			excludeExtraneousValues: true,
		});
	}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Patch(':projectId')
	@UseGuards(JwtAuthGuard)
	async updateProject(
		@Req() req: IApiRequest,
		@Body() dto: UpdateProjectDto,
		@Param('projectId', ParseUUIDPipe) projectId: string,
	) {
		const { user } = req;
		const project = await this.projectService.updateProjectById(
			projectId,
			user,
			dto,
		);
		return plainToInstance(ProjectDto, project, {
			excludeExtraneousValues: true,
		});
	}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Post()
	@UseGuards(JwtAuthGuard)
	async createProject(
		@Req() { user }: IApiRequest,
		@Body() dto: CreateProjectDto,
	) {
		const project = await this.projectService.createProject(dto, user);
		return plainToInstance(ProjectDto, project, {
			excludeExtraneousValues: true,
		});
	}
}
