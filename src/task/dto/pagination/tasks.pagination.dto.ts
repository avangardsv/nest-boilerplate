import { Exclude, Expose, Type } from 'class-transformer';
import { BasePaginationDto } from 'src/common/pagination/dto/base.pagination.dto';
import { TaskDto } from '../task.dto';

@Exclude()
export class TasksPaginationDto extends BasePaginationDto<TaskDto> {
	@Expose()
	@Type(() => TaskDto)
	items: TaskDto[];
}
