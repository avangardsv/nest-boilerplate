# Task: Implement Database Transaction Patterns

## Context
The application needs proper database transaction handling for operations that require atomicity, consistency, and error handling. This is critical for maintaining data integrity when performing multiple related database operations.

## Current State
- No transaction handling implemented
- Multiple database operations are not atomic
- No rollback mechanism on errors
- No transaction manager pattern

## Requirements

### 1. Create Transaction Service

Create `src/common/services/transaction.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async executeInTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      try {
        return await callback(tx);
      } catch (error) {
        // Transaction will be automatically rolled back
        throw error;
      }
    });
  }

  async executeInTransactionWithRetry<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
    maxRetries = 3,
    retryDelay = 100,
  ): Promise<T> {
    let lastError: Error | unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeInTransaction(callback);
      } catch (error) {
        lastError = error;

        // Check if it's a retryable error (deadlock, timeout, etc.)
        if (this.isRetryableError(error) && attempt < maxRetries) {
          const delay = retryDelay * attempt;
          await this.delay(delay);
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Deadlock, lock wait timeout, etc.
      return error.code === 'P2034' || error.code === 'P1008';
    }
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### 2. Update Prisma Service

Update `src/prisma/prisma.service.ts` to export transaction types:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Helper method for transactions
  async transaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(callback);
  }
}
```

### 3. Usage Examples

#### Basic Transaction Usage

```typescript
import { Injectable } from '@nestjs/common';
import { TransactionService } from '../common/services/transaction.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionService: TransactionService,
  ) {}

  async createTaskWithProject(data: CreateTaskWithProjectDto) {
    return this.transactionService.executeInTransaction(async (tx) => {
      // Create project first
      const project = await tx.project.create({
        data: {
          name: data.projectName,
          description: data.projectDescription,
        },
      });

      // Create task with project reference
      const task = await tx.task.create({
        data: {
          name: data.taskName,
          projectId: project.id,
        },
      });

      return { project, task };
    });
  }
}
```

#### Transaction with Rollback on Error

```typescript
@Injectable()
export class UserService {
  async createUserWithProfile(data: CreateUserDto) {
    return this.transactionService.executeInTransaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
        },
      });

      // Create profile
      const profile = await tx.profile.create({
        data: {
          userId: user.id,
          firstName: data.firstName,
          lastName: data.lastName,
        },
      });

      // If this fails, both user and profile creation will be rolled back
      await this.sendWelcomeEmail(user.email);

      return { user, profile };
    });
  }
}
```

#### Transaction with Retry Logic

```typescript
@Injectable()
export class OrderService {
  async processOrder(orderId: string) {
    return this.transactionService.executeInTransactionWithRetry(
      async (tx) => {
        // Lock the order row
        const order = await tx.order.findUnique({
          where: { id: orderId },
        });

        if (!order) {
          throw new NotFoundException('Order', orderId);
        }

        if (order.status !== 'PENDING') {
          throw new ConflictException('Order already processed');
        }

        // Update order status
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'PROCESSING' },
        });

        // Process payment
        await this.paymentService.process(order);

        // Update inventory
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { decrement: item.quantity },
            },
          });
        }

        // Finalize order
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'COMPLETED' },
        });

        return order;
      },
      3, // max retries
      100, // initial retry delay in ms
    );
  }
}
```

#### Batch Operations in Transaction

```typescript
@Injectable()
export class BulkOperationService {
  async bulkUpdateTasks(updates: Array<{ id: string; data: UpdateTaskDto }>) {
    return this.transactionService.executeInTransaction(async (tx) => {
      const results = await Promise.all(
        updates.map((update) =>
          tx.task.update({
            where: { id: update.id },
            data: update.data,
          }),
        ),
      );

      return results;
    });
  }
}
```

### 4. Create Transaction Decorator (Optional)

Create `src/common/decorators/transaction.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

export const TRANSACTION_KEY = 'transaction';
export const Transaction = () => SetMetadata(TRANSACTION_KEY, true);
```

### 5. Create Transaction Interceptor (Optional)

Create `src/common/interceptors/transaction.interceptor.ts`:

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TransactionService } from '../services/transaction.service';
import { TRANSACTION_KEY } from '../decorators/transaction.decorator';
import { Reflector } from '@nestjs/core';

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isTransaction = this.reflector.getAllAndOverride<boolean>(TRANSACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isTransaction) {
      return next.handle();
    }

    // Wrap the handler in a transaction
    return new Observable((observer) => {
      this.transactionService
        .executeInTransaction(async (tx) => {
          // Store transaction client in request context
          const request = context.switchToHttp().getRequest();
          request.transaction = tx;

          return next.handle().toPromise();
        })
        .then((result) => {
          observer.next(result);
          observer.complete();
        })
        .catch((error) => {
          observer.error(error);
        });
    });
  }
}
```

## Best Practices

1. **Keep Transactions Short**: Long-running transactions can cause deadlocks and performance issues
2. **Handle Deadlocks**: Implement retry logic for operations that might encounter deadlocks
3. **Error Handling**: Always handle errors properly to ensure rollback
4. **Avoid Nested Transactions**: Prisma doesn't support nested transactions, use a single transaction for related operations
5. **Lock Rows When Needed**: Use `findUnique` with `forUpdate` for row-level locking
6. **Batch Operations**: Group related operations in a single transaction
7. **Test Transactions**: Write tests that verify rollback behavior

## Testing

Create tests for:
- [ ] Transaction commits successfully
- [ ] Transaction rolls back on error
- [ ] Retry logic works for deadlocks
- [ ] Multiple operations in transaction are atomic
- [ ] Nested service calls use same transaction

## Benefits

- Data consistency and integrity
- Atomic operations (all or nothing)
- Automatic rollback on errors
- Retry logic for transient errors
- Better error handling
- Prevents partial updates

## Common Transaction Patterns

1. **Create with Related Records**: Creating a parent record with child records
2. **Update Multiple Records**: Updating related records atomically
3. **Transfer Operations**: Moving data between records (e.g., money transfer)
4. **Bulk Operations**: Processing multiple records together
5. **Status Changes**: Changing status with validation and side effects

## References

- Prisma Transactions: https://www.prisma.io/docs/concepts/components/prisma-client/transactions
- Database Transactions: https://en.wikipedia.org/wiki/Database_transaction
- ACID Properties: https://en.wikipedia.org/wiki/ACID

