import { ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { IsOptional } from 'class-validator';

@Exclude()
export class BasePaginationOptionsDto {
  @Expose()
  @ApiPropertyOptional({
    description: 'Current page',
    default: 1,
  })
  @Type(() => Number)
  page: number;

  @Expose()
  @ApiPropertyOptional({
    description: 'Items per page',
    default: 12,
  })
  @Type(() => Number)
  perPage: number;

  @Expose()
  @IsOptional()
  filters?: Record<string, unknown>;

  @Expose()
  @ApiPropertyOptional({
    description: 'Pagination search string',
    default: '',
  })
  @IsOptional()
  search?: string;
}
