import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtUserInfo } from 'src/common/types/jwt-user-info.type';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-copmany.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company } from '@prisma/client';
import { CompanyPaginationOptionsDto } from './dto/pagination/companies.pagination.options.dto';
import { CompanyPaginationDto } from './dto/pagination/companies.pagination.dto';

@Injectable()
export class CompanyService {
  constructor(private readonly prismaService: PrismaService) {}

  async getCompanyById(id: string, user: JwtUserInfo) {
    // TODO: add 404 error validation message to prisma filter
    const company = await this.prismaService.company.findFirstOrThrow({
      where: { id },
    });

    if (company.ownerId === user.id || user.isAdmin) return company;

    throw new ForbiddenException("User can't get company");
  }

  async createCompany(data: CreateCompanyDto) {
    return this.prismaService.company.create({ data });
  }

  async updateCompanyById(
    id: string,
    user: JwtUserInfo,
    data: Partial<Company> & UpdateCompanyDto,
  ) {
    const whereConditions: { id: string; ownerId?: string } = { id };
    if (!user.isAdmin) whereConditions.ownerId = user.id;

    if (data.unarchive) data.deletedAt = null;

    const company = await this.prismaService.company.update({
      where: whereConditions,
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
    return company;
  }

  async getCompanies(
    options: CompanyPaginationOptionsDto,
    user: JwtUserInfo,
  ): Promise<CompanyPaginationDto> {
    const whereConditions: { ownerId?: string } = {};
    if (!user.isAdmin) whereConditions.ownerId = user.id;
    // if (options.search) whereConditions.name = { startWith: options.search };

    const items = await this.prismaService.company.findMany({
      where: whereConditions,
      take: options.perPage,
      skip: options.perPage * (options.page - 1),
    });

    const count = await this.prismaService.company.count({
      where: whereConditions,
    });

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
