import { ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

@Exclude()
export class UpdateCompanyDto {
  @Expose()
  @Length(1, 32)
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    default: 'X',
    description: 'New company name',
  })
  name?: string;

  @Expose()
  @IsUUID()
  @IsOptional()
  @ApiPropertyOptional({ description: 'New owner uuid', default: '' })
  ownerId?: string;

  @Expose()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Unarchive deleted company',
    default: false,
  })
  unarchive?: boolean;
}
