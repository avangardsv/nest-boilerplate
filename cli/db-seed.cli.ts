import { INestApplicationContext, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ADMIN_USER_ID } from 'src/common/constants/user.constants';
import { CompanyService } from 'src/company/company.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserService } from 'src/user/user.service';
import {
	user1Data,
	user2Data,
	userData,
} from 'src/common/constants/user.constants';
import { ProjectService } from 'src/project/project.service';
import {
	adminCompanyData,
	company1Data,
	company2Data,
	companyData,
} from 'src/common/constants/company.constants';
import { TaskService } from 'src/task/task.service';
import {
	projectData,
} from 'src/common/constants/project.constants';
import { Company, Priority, Status, User } from '@prisma/client';
import { taskData } from 'src/common/constants/task.constants';
import { StatusService } from 'src/status/status.service';
import { high, low, medium } from 'src/common/constants/prority.constants';
import { PriorityService } from 'src/priority/priority.service';
import { completed, inProgress, todo } from 'src/common/constants/status.constants';

async function seedUsers(app: INestApplicationContext) {
	const userService = app.get(UserService);
	await userService.onModuleInit();
	return [
		await userService.create(userData),
		await userService.create(user1Data),
		await userService.create(user2Data),
	];
}

async function seedCompanies(app: INestApplicationContext) {
	const companyService = app.get(CompanyService);
	return [
		await companyService.createCompany(adminCompanyData),
		await companyService.createCompany(companyData),
		await companyService.createCompany(company1Data),
		await companyService.createCompany(company2Data),
	];
}

async function seedProjects(app: INestApplicationContext, users: User[]) {
	const projectService = app.get(ProjectService);
	const projects = users.map( (user) => projectService.createProject(projectData, user));
    await Promise.all(projects);
	return projects;
}

 async function seedTasks(app: INestApplicationContext, users: User[], statuses: Status[], priorities: Priority[]) {
    const taskService = app.get(TaskService);
    const tasks = users.map( (user) => {
        return taskService.createTask({...taskData, statusId: statuses[0].id, priorityId: priorities[0].id, assigneeId: user.id, reporterId: user.id}, user);
    });
    await Promise.all(tasks);
    return tasks;
 }

async function seedPriorities(app: INestApplicationContext) {
    const priorityService = app.get(PriorityService);
    return Promise.all([ 
        priorityService.createPriority(high),
        priorityService.createPriority(medium),
        priorityService.createPriority(low)
    ]);
}

async function seedStatuses(app: INestApplicationContext) {
    const statusService = app.get(StatusService);
    return  Promise.all([ 
        statusService.createStatus(inProgress),
        statusService.createStatus(completed),
        statusService.createStatus(todo)
    ]);
}

@Module({
	providers: [UserService, CompanyService, ProjectService, TaskService, StatusService, PriorityService],
	imports: [PrismaModule],
})
export class SeedModule {}

async function run() {
	const app = await NestFactory.createApplicationContext(SeedModule);
	
	// 1. Seed base entities (no dependencies)
	const users = await seedUsers(app);
	const statuses = await seedStatuses(app);
	const priorities = await seedPriorities(app);
	
	// 2. Seed dependent entities
	await seedCompanies(app);
	await seedProjects(app, users);
	
	// 3. Seed tasks (needs users, statuses, priorities)
	await seedTasks(app, users, statuses, priorities);
}

run();
