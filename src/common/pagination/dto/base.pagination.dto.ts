import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class PaginatioMetaData {
  @Expose()
  page: number;

  @Expose()
  perPage: number;

  @Expose()
  total: number;

  @Expose()
  totalPages: number;
}

@Exclude()
export class BasePaginationDto<T> {
  @Expose()
  items: T[];

  @Expose()
  meta: PaginatioMetaData;
}
