import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsString, Length } from 'class-validator';

@Exclude()
export class CreateCompanyDto {
  @Expose()
  @Length(1, 32)
  @IsString()
  @ApiProperty({
    default: 'X',
  })
  name: string;
  @ApiHideProperty()
  ownerId: string;
}
