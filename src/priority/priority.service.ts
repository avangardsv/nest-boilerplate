import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePriorityDto } from './dto/create-priority.dto';
import { PrioritiesPaginationOptionsDto } from './dto/pagination/priorities.pagination.options.dto';
import { UpdatePriorityDto } from './dto/update-priority.dto';

@Injectable()
export class PriorityService {
	constructor(private readonly prismaService: PrismaService) {}

	async getPriorityById(id: string) {
		return this.prismaService.priority.findUniqueOrThrow({ where: { id } });
	}

	async createPriority(data: CreatePriorityDto) {
		return this.prismaService.priority.create({ data });
	}

	async updatePriorityById(id: string, data: UpdatePriorityDto) {
		return this.prismaService.priority.update({
			where: { id },
			data,
		});
	}

	async deletePriorityById(id: string) {
		return this.prismaService.priority.delete({ where: { id } });
	}

	async getPriorities(options: PrioritiesPaginationOptionsDto) {
		const items = await this.prismaService.priority.findMany({
			take: options.perPage,
			skip: options.perPage * (options.page - 1),
		});

		const count = await this.prismaService.priority.count();

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
