import { Exclude, Expose, Type } from 'class-transformer';
import { BasePaginationDto } from 'src/common/pagination/dto/base.pagination.dto';
import { CompanyDto } from '../company.dto';

@Exclude()
export class CompanyPaginationDto extends BasePaginationDto<CompanyDto> {
	@Expose()
	@Type(() => CompanyDto)
	items: CompanyDto[];
}
