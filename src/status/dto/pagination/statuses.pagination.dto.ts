import { BasePaginationDto } from 'src/common/pagination/dto/base.pagination.dto';
import { StatusDto } from '../status.dto';

export class StatusesPaginationDto extends BasePaginationDto<StatusDto> {
  items: StatusDto[];
}