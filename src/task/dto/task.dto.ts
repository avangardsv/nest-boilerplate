import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class TaskDto {
  @Expose()
  id: string;
  @Expose()
  name: string;
  @Expose()
  description: string;
  @Expose({ name: 'statudId' })
  statusId: string;
  @Expose()
  assigneeId: string;
  @Expose()
  reporterId: string;
  @Expose()
  priorityId: string;
  @Expose()
  deletedAt: Date;
  @Expose()
  updatedAt: Date;
  @Expose()
  createdAt: Date;
}
