import { Exclude, Expose, Type } from 'class-transformer';
import { BasePaginationDto } from 'src/common/pagination/dto/base.pagination.dto';
import { ProjectDto } from '../project.dto';

@Exclude()
export class ProjectsPaginationDto extends BasePaginationDto<ProjectDto> {
  @Expose()
  @Type(() => ProjectDto)
  items: ProjectDto[];
}

