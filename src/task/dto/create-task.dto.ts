import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsString, IsUUID, Length } from 'class-validator';

@Exclude()
export class CreateTaskDto {
	@Expose()
	@Length(1, 64)
	@IsString()
	@ApiProperty({ default: 'My Task' })
	name: string;

	@Expose()
	@Length(1, 1024)
	@IsString()
	@ApiProperty({ default: 'Details about the task' })
	description: string;

	@Expose()
	@IsUUID()
	@ApiProperty({ description: 'Status UUID' })
	statusId: string;

	@Expose()
	@IsUUID()
	@ApiProperty({ description: 'Priority UUID' })
	priorityId: string;

	@Expose()
	@IsUUID()
	@ApiProperty({ description: 'Assignee user UUID' })
	assigneeId: string;
}
