import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStatusDto } from './dto/create-status.dto';
import { StatusesPaginationOptionsDto } from './dto/pagination/statuses.pagination.options.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Injectable()
export class StatusService {
	constructor(private readonly prismaService: PrismaService) {}

	async getStatusById(id: string) {
		return this.prismaService.status.findUniqueOrThrow({ where: { id } });
	}

	async createStatus(data: CreateStatusDto) {
		return this.prismaService.status.create({ data });
	}

	async updateStatusById(id: string, data: UpdateStatusDto) {
		return this.prismaService.status.update({
			where: { id },
			data,
		});
	}

	async deleteStatusById(id: string) {
		return this.prismaService.status.delete({ where: { id } });
	}

	async getStatuses(options: StatusesPaginationOptionsDto) {
		const items = await this.prismaService.status.findMany({
			take: options.perPage,
			skip: options.perPage * (options.page - 1),
		});

		const count = await this.prismaService.status.count();

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
