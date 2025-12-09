# Task: Implement Cron Jobs and Scheduled Tasks

## Context
The application needs scheduled background tasks for maintenance, cleanup, and automated operations. This includes tasks like cleaning up expired data, sending notifications, and updating statistics.

## Current State
- No cron jobs implemented
- No scheduled tasks
- No background job processing

## Requirements

### 1. Install Required Dependencies

```bash
yarn add @nestjs/schedule
```

### 2. Create Cron Module

Create `src/cron/cron.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './cron.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    ConfigModule,
  ],
  providers: [CronService],
  exports: [CronService],
})
export class CronModule {}
```

### 3. Create Cron Service

Create `src/cron/cron.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '../config/config.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  /**
   * Clean up expired refresh tokens
   * Runs daily at 2:00 AM
   */
  @Cron('0 2 * * *')
  async handleCleanupExpiredRefreshTokens(): Promise<void> {
    this.logger.log('Starting cleanup of expired refresh tokens');

    try {
      const result = await this.prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} expired refresh tokens`);
    } catch (error) {
      this.logger.error('Failed to cleanup expired refresh tokens', error);
    }
  }

  /**
   * Clean up soft-deleted records older than 30 days
   * Runs daily at 3:00 AM
   */
  @Cron('0 3 * * *')
  async handleCleanupSoftDeletedRecords(): Promise<void> {
    this.logger.log('Starting cleanup of soft-deleted records');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Clean up soft-deleted users
      const deletedUsers = await this.prisma.user.deleteMany({
        where: {
          deletedAt: {
            not: null,
            lt: thirtyDaysAgo,
          },
        },
      });

      // Clean up soft-deleted tasks
      const deletedTasks = await this.prisma.task.deleteMany({
        where: {
          deletedAt: {
            not: null,
            lt: thirtyDaysAgo,
          },
        },
      });

      this.logger.log(
        `Cleaned up ${deletedUsers.count} users and ${deletedTasks.count} tasks`,
      );
    } catch (error) {
      this.logger.error('Failed to cleanup soft-deleted records', error);
    }
  }

  /**
   * Send reminder emails for overdue tasks
   * Runs every day at 9:00 AM
   */
  @Cron('0 9 * * *')
  async handleSendOverdueTaskReminders(): Promise<void> {
    this.logger.log('Starting overdue task reminders');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdueTasks = await this.prisma.task.findMany({
        where: {
          dueDate: {
            lt: today,
          },
          status: {
            not: 'completed',
          },
          deletedAt: null,
        },
        include: {
          assignedTo: true,
        },
      });

      // TODO: Implement email sending service
      // for (const task of overdueTasks) {
      //   await this.emailService.sendOverdueTaskReminder(task);
      // }

      this.logger.log(`Found ${overdueTasks.length} overdue tasks`);
    } catch (error) {
      this.logger.error('Failed to send overdue task reminders', error);
    }
  }

  /**
   * Update task statistics
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleUpdateTaskStatistics(): Promise<void> {
    this.logger.log('Updating task statistics');

    try {
      const stats = await this.prisma.task.groupBy({
        by: ['status'],
        where: {
          deletedAt: null,
        },
        _count: {
          id: true,
        },
      });

      this.logger.log('Task statistics:', stats);
      // TODO: Store statistics in database or cache
    } catch (error) {
      this.logger.error('Failed to update task statistics', error);
    }
  }

  /**
   * Health check for cron jobs
   * Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCronHealthCheck(): Promise<void> {
    this.logger.debug('Cron health check - all scheduled tasks are running');
  }

  /**
   * Example: Dynamic cron job registration
   */
  addCronJob(name: string, cronExpression: string, callback: () => void): void {
    const job = new CronJob(cronExpression, callback);
    this.schedulerRegistry.addCronJob(name, job);
    job.start();
    this.logger.log(`Cron job ${name} added and started`);
  }

  /**
   * Example: Delete a cron job
   */
  deleteCronJob(name: string): void {
    this.schedulerRegistry.deleteCronJob(name);
    this.logger.log(`Cron job ${name} deleted`);
  }
}
```

### 4. Update App Module

Update `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { CronModule } from './cron/cron.module';
// ... other imports

@Module({
  imports: [
    ConfigModule,
    // Conditionally load cron module based on environment
    ...(process.env.ENABLE_CRON === 'true' ? [CronModule] : []),
    // ... other modules
  ],
})
export class AppModule {}
```

### 5. Cron Expression Examples

Common cron expressions:

```typescript
// Every minute
@Cron(CronExpression.EVERY_MINUTE)

// Every 5 minutes
@Cron(CronExpression.EVERY_5_MINUTES)

// Every hour
@Cron(CronExpression.EVERY_HOUR)

// Every day at midnight
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)

// Every day at 2:00 AM
@Cron('0 2 * * *')

// Every Monday at 9:00 AM
@Cron('0 9 * * 1')

// Every first day of month at midnight
@Cron('0 0 1 * *')

// Custom: Every 30 minutes
@Cron('*/30 * * * *')
```

### 6. Environment Configuration

Update `.env.example`:

```bash
# Cron Jobs
ENABLE_CRON=false
```

### 7. Create Cron Job Interface (Optional)

Create `src/cron/interfaces/cron-job.interface.ts`:

```typescript
export interface ICronJob {
  name: string;
  schedule: string;
  enabled: boolean;
  description: string;
}
```

### 8. Create Cron Job Registry (Optional)

Create `src/cron/services/cron-job-registry.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ICronJob } from '../interfaces/cron-job.interface';

@Injectable()
export class CronJobRegistryService {
  constructor(private readonly schedulerRegistry: SchedulerRegistry) {}

  registerJob(job: ICronJob, callback: () => void): void {
    const cronJob = new CronJob(job.schedule, callback);
    this.schedulerRegistry.addCronJob(job.name, cronJob);
    cronJob.start();
  }

  unregisterJob(name: string): void {
    this.schedulerRegistry.deleteCronJob(name);
  }

  getJob(name: string): CronJob {
    return this.schedulerRegistry.getCronJob(name);
  }

  getAllJobs(): Map<string, CronJob> {
    return this.schedulerRegistry.getCronJobs();
  }
}
```

## Testing

Create tests for:
- [ ] Cron jobs execute at correct intervals
- [ ] Cron jobs handle errors gracefully
- [ ] Cron jobs can be enabled/disabled
- [ ] Dynamic cron job registration works
- [ ] Cron jobs log appropriately

## Best Practices

1. **Error Handling**: Always wrap cron job logic in try-catch
2. **Logging**: Log start, completion, and errors
3. **Idempotency**: Make cron jobs idempotent (safe to run multiple times)
4. **Performance**: Optimize queries and batch operations
5. **Monitoring**: Monitor cron job execution and failures
6. **Configuration**: Make cron jobs configurable via environment variables

## Common Use Cases

1. **Cleanup Jobs**: Remove expired data, old logs, temporary files
2. **Statistics**: Update aggregated statistics, generate reports
3. **Notifications**: Send reminder emails, push notifications
4. **Data Sync**: Sync data with external services
5. **Health Checks**: Verify system health, check dependencies

## Production Considerations

1. **Single Instance**: Ensure only one instance runs cron jobs (use database locks)
2. **Monitoring**: Set up alerts for failed cron jobs
3. **Logging**: Log all cron job executions
4. **Performance**: Monitor resource usage of cron jobs
5. **Scheduling**: Avoid running heavy jobs during peak hours

## Benefits

- Automated maintenance tasks
- Reduced manual intervention
- Consistent data cleanup
- Automated notifications
- Background processing

## References

- NestJS Schedule: https://docs.nestjs.com/techniques/task-scheduling
- Cron Expression: https://crontab.guru/

