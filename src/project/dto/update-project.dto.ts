import { ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

@Exclude()
export class UpdateProjectDto {
  @Expose()
  @Length(1, 32)
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ default: 'Renamed Project' })
  name?: string;

  @Expose()
  @IsUUID()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Move project to another company' })
  companyId?: string;

  @Expose()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Unarchive deleted project', default: false })
  unarchive?: boolean;
}

