import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class CompanyDto {
  @Expose()
  id: string;
  @Expose()
  name: string;
  @Expose()
  ownerId: string;
  @Expose()
  deletedAt: Date;
  @Expose()
  updatedAt: Date;
  @Expose()
  createdAt: Date;
}
