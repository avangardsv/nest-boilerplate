import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

@Module({
	providers: [ProjectService],
	controllers: [ProjectController],
})
export class ProjectModule {}
