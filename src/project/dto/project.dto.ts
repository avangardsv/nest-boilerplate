import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ProjectDto {
  @Expose()
  id: string;
  @Expose()
  name: string;
  @Expose()
  companyId: string;
  @Expose()
  deletedAt: Date;
  @Expose()
  updatedAt: Date;
  @Expose()
  createdAt: Date;
}

