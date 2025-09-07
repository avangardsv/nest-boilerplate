import { ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

@Exclude()
export class UpdateTaskDto {
  @Expose()
  @Length(1, 64)
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ default: 'Renamed Task' })
  name?: string;

  @Expose()
  @Length(1, 1024)
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ default: 'Updated description' })
  description?: string;

  @Expose()
  @IsUUID()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Change status' })
  statusId?: string;

  @Expose()
  @IsUUID()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Change priority' })
  priorityId?: string;

  @Expose()
  @IsUUID()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Reassign task' })
  assigneeId?: string;

  @Expose()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Unarchive deleted task', default: false })
  unarchive?: boolean;
}

