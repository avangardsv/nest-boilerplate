import { BasePaginationDto } from 'src/common/pagination/dto/base.pagination.dto';
import { PriorityDto } from '../priority.dto';

export class PrioritiesPaginationDto extends BasePaginationDto<PriorityDto> {
  items: PriorityDto[];
}