import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class PriorityDto {
	@Expose()
	@ApiProperty()
	id: string;

	@Expose()
	@ApiProperty()
	name: string;
}
