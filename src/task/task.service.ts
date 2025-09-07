import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtUserInfo } from 'src/common/types/jwt-user-info.type';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Prisma, Task } from '@prisma/client';
import { TasksPaginationOptionsDto } from './dto/pagination/tasks.pagination.options.dto';

@Injectable()
export class TaskService {
  constructor(private readonly prismaService: PrismaService) {}

  async getTaskById(id: string, user: JwtUserInfo) {
    if (user.isAdmin)
      return this.prismaService.task.findUniqueOrThrow({ where: { id } });

    return this.prismaService.task.findFirstOrThrow({
      where: { id, OR: [{ reporterId: user.id }, { assigneeId: user.id }] },
    });
  }

  async createTask(data: CreateTaskDto & { reporterId: string }, user: JwtUserInfo) {
    if (!user.isAdmin && data.reporterId !== user.id)
      throw new ForbiddenException("User can't create task for another reporter");
    const prismaData = {
      name: data.name,
      description: data.description,
      statudId: data.statusId,
      priorityId: data.priorityId,
      assigneeId: data.assigneeId,
      reporterId: data.reporterId,
    };
    return this.prismaService.task.create({ data: prismaData });
  }

  async updateTaskById(
    id: string,
    user: JwtUserInfo,
    data: Partial<Task> & UpdateTaskDto,
  ) {
    if (data.unarchive) data.deletedAt = null;

    if (!user.isAdmin) {
      const canModify = await this.prismaService.task.findFirst({
        where: { id, OR: [{ reporterId: user.id }, { assigneeId: user.id }] },
        select: { id: true },
      });
      if (!canModify) throw new ForbiddenException("User can't update task");
    }

    const prismaData = { ...data, updatedAt: new Date() };
    if (data.statusId) {
      prismaData.statudId = data.statusId;
      delete prismaData.statusId;
    }
    return this.prismaService.task.update({ where: { id }, data: prismaData });
  }

  async getTasks(options: TasksPaginationOptionsDto, user: JwtUserInfo) {
    const where: Prisma.TaskWhereInput = {};
    if (!user.isAdmin) where.OR = [{ reporterId: user.id }, { assigneeId: user.id }];
    // if (options.search) where.name = { startsWith: options.search };

    const items = await this.prismaService.task.findMany({
      where,
      take: options.perPage,
      skip: options.perPage * (options.page - 1),
    });

    const count = await this.prismaService.task.count({ where });

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
