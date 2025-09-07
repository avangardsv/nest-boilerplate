import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsString, Length, IsUUID } from 'class-validator';

@Exclude()
export class CreateProjectDto {
  @Expose()
  @Length(1, 32)
  @IsString()
  @ApiProperty({ default: 'My Project' })
  name: string;

  @Expose()
  @IsUUID()
  @ApiProperty({ description: 'Company UUID the project belongs to' })
  companyId: string;
}

