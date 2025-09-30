import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, Project } from '@prisma/client';
import { JwtUserInfo } from 'src/common/types/jwt-user-info.type';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectsPaginationOptionsDto } from './dto/pagination/projects.pagination.options.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectService {
	constructor(private readonly prismaService: PrismaService) {}

	async getProjectById(id: string, user: JwtUserInfo) {
		if (user.isAdmin)
			return this.prismaService.project.findUniqueOrThrow({ where: { id } });

		return this.prismaService.project.findFirstOrThrow({
			where: { id, company: { ownerId: user.id } },
		});
	}

	async createProject(data: CreateProjectDto, user: JwtUserInfo) {
		if (user.isAdmin) return this.prismaService.project.create({ data });
		const ownsCompany = await this.prismaService.company.findFirst({
			where: { id: data.companyId, ownerId: user.id },
			select: { id: true },
		});
		if (!ownsCompany)
			throw new ForbiddenException("User can't create project for company");
	}

	async updateProjectById(
		id: string,
		user: JwtUserInfo,
		data: Partial<Project> & UpdateProjectDto,
	) {
		if (data.unarchive) data.deletedAt = null;

		if (!user.isAdmin) {
			const canUpdate = await this.prismaService.project.findFirst({
				where: { id, company: { ownerId: user.id } },
				select: { id: true },
			});
			if (!canUpdate) throw new ForbiddenException("User can't update project");
		}

		return this.prismaService.project.update({
			where: { id },
			data: {
				...data,
				updatedAt: new Date(),
			},
		});
	}

	async getProjects(options: ProjectsPaginationOptionsDto, user: JwtUserInfo) {
		const where: Prisma.ProjectWhereInput = {};
		if (!user.isAdmin) where.company = { ownerId: user.id };
		// if (options.search) where.name = { startsWith: options.search };

		const items = await this.prismaService.project.findMany({
			where,
			take: options.perPage,
			skip: options.perPage * (options.page - 1),
		});

		const count = await this.prismaService.project.count({ where });

		return {
			items,
			meta: {
				page: options.page,
				perPage: items.length,
				totalPages: Math.ceil(count / options.perPage),
				total: count,
			},
		};
	}
}
