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
import { UpdateUserDto } from 'src/user/dto/update.user.dto';
import { CompanyService } from './company.service';
import { CompanyDto } from './dto/company.dto';
import { CreateCompanyDto } from './dto/create-copmany.dto';
import { CompanyPaginationDto } from './dto/pagination/companies.pagination.dto';
import { CompanyPaginationOptionsDto } from './dto/pagination/companies.pagination.options.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Controller('company')
@ApiBearerAuth()
@ApiTags('company')
export class CompanyController {
	constructor(private readonly companyService: CompanyService) {}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Post('pagination')
	@UseGuards(JwtAuthGuard)
	async getCompanies(
		@Req() req: IApiRequest,
		@Body() options: CompanyPaginationOptionsDto,
	) {
		const { user } = req;
		const companies = await this.companyService.getCompanies(options, user);
		return plainToInstance(CompanyPaginationDto, companies, {
			excludeExtraneousValues: true,
		});
	}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Get(':companyId')
	@UseGuards(JwtAuthGuard)
	async getCompany(
		@Param('companyId', ParseUUIDPipe) companyId: string,
		@Req() req: IApiRequest,
	) {
		const { user } = req;
		const company = await this.companyService.getCompanyById(companyId, user);
		return plainToInstance(CompanyDto, company, {
			excludeExtraneousValues: true,
		});
	}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Delete(':companyId')
	@UseGuards(JwtAuthGuard)
	async deleteCompany(
		@Param('companyId', ParseUUIDPipe) companyId: string,
		@Req() req: IApiRequest,
	) {
		const { user } = req;
		const company = await this.companyService.updateCompanyById(
			companyId,
			user,
			{ deletedAt: new Date() },
		);
		return plainToInstance(CompanyDto, company, {
			excludeExtraneousValues: true,
		});
	}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Patch(':companyId')
	@UseGuards(JwtAuthGuard)
	async updateCompany(
		@Req() req: IApiRequest,
		@Body() dto: UpdateCompanyDto,
		@Param('companyId', ParseUUIDPipe) companyId: string,
	) {
		const { user } = req;
		const company = await this.companyService.updateCompanyById(
			companyId,
			user,
			dto,
		);
		return plainToInstance(UpdateUserDto, company, {
			excludeExtraneousValues: true,
		});
	}

	@ApiConsumes('application/x-www-form-urlencoded')
	@Post()
	@UseGuards(JwtAuthGuard)
	async createCompany(
		@Req() { user }: IApiRequest,
		@Body() dto: CreateCompanyDto,
	) {
		const company = await this.companyService.createCompany({
			...dto,
			ownerId: user.id,
		});
		return plainToInstance(CompanyDto, company, {
			excludeExtraneousValues: true,
		});
	}
}
