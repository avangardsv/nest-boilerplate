import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsString, Length } from 'class-validator';

@Exclude()
export class CreatePriorityDto {
  @Expose()
  @Length(1, 64)
  @IsString()
  @ApiProperty({ default: 'High' })
  name: string;
}