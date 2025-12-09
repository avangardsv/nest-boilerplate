# Task: Fix Schema Typo - statudId to statusId

## Context
The Prisma schema has a typo in the Task model where the foreign key field is named `statudId` instead of `statusId`. This typo has propagated throughout the codebase into entities, DTOs, and service logic.

## Current State

### In prisma/schema.prisma:
```prisma
model Task {
  id          String    @id @default(uuid())
  name        String
  description String
  status      Status    @relation(fields: [statudId], references: [id])
  statudId    String    // TYPO: should be statusId
  // ... rest of fields
}
```

### Locations Where Typo Exists:
1. `prisma/schema.prisma` - Schema definition
2. Any generated Prisma client types (auto-fixed after migration)
3. Potentially in service files where `statudId` is referenced

## Requirements

### 1. Update Prisma Schema

Fix the field name in the schema:

```prisma
model Task {
  id          String    @id @default(uuid())
  name        String
  description String
  status      Status    @relation(fields: [statusId], references: [id])
  statusId    String    // Fixed from statudId
  assignee    User?     @relation("TaskAssignee", fields: [assigneeId], references: [id])
  assigneeId  String?
  reporter    User      @relation("TaskReporter", fields: [reporterId], references: [id])
  reporterId  String
  priority    Priority  @relation(fields: [priorityId], references: [id])
  priorityId  String
  deletedAt   DateTime?
  updatedAt   DateTime?
  createdAt   DateTime? @default(now())
}
```

### 2. Create Database Migration

Generate a migration to rename the column:

```bash
# Generate migration
npx prisma migrate dev --name fix_task_statusid_typo
```

The migration will automatically:
- Rename the `statudId` column to `statusId` in the database
- Update the foreign key constraint
- Preserve all existing data

### 3. Search and Replace in Codebase

Search for any references to `statudId` and replace with `statusId`:

#### Search locations:
```bash
# Search entire codebase
grep -r "statudId" src/
grep -r "statudId" prisma/
```

#### Files likely to contain references:
- `src/task/task.service.ts`
- `src/task/dto/*.dto.ts`
- `src/task/task.controller.ts`
- Any test files

#### Example fixes:

**Before:**
```typescript
// DTO
export class CreateTaskDto {
  name: string;
  description: string;
  statudId: string;  // TYPO
  priorityId: string;
  assigneeId?: string;
}

// Service
const task = await this.prisma.task.create({
  data: {
    ...createTaskDto,
    statudId: dto.statusId,  // TYPO
    reporterId: currentUser.id,
  },
});

// Query
const tasks = await this.prisma.task.findMany({
  where: {
    statudId: statusId,  // TYPO
  },
});
```

**After:**
```typescript
// DTO
export class CreateTaskDto {
  name: string;
  description: string;
  statusId: string;  // Fixed
  priorityId: string;
  assigneeId?: string;
}

// Service
const task = await this.prisma.task.create({
  data: {
    ...createTaskDto,
    statusId: dto.statusId,  // Fixed
    reporterId: currentUser.id,
  },
});

// Query
const tasks = await this.prisma.task.findMany({
  where: {
    statusId: statusId,  // Fixed
  },
});
```

### 4. Update Swagger Documentation

If there are any `@ApiProperty` decorators with `statudId`, update them:

```typescript
// Before
@ApiProperty({ example: 'uuid-string', description: 'Status ID' })
statudId: string;

// After
@ApiProperty({ example: 'uuid-string', description: 'Status ID' })
statusId: string;
```

### 5. Regenerate Prisma Client

After updating the schema, regenerate the Prisma client:

```bash
npx prisma generate
```

This ensures TypeScript types are updated with the correct field name.

### 6. Check Seeder Files

If seeders reference `statudId`, update them:

```typescript
// Before
await prisma.task.create({
  data: {
    name: 'Sample Task',
    description: 'Description',
    statudId: status.id,  // TYPO
    priorityId: priority.id,
    reporterId: user.id,
  },
});

// After
await prisma.task.create({
  data: {
    name: 'Sample Task',
    description: 'Description',
    statusId: status.id,  // Fixed
    priorityId: priority.id,
    reporterId: user.id,
  },
});
```

### 7. Update Tests

Check test files for the typo:

```typescript
// Before
const createTaskDto: CreateTaskDto = {
  name: 'Test Task',
  description: 'Test Description',
  statudId: 'status-uuid',  // TYPO
  priorityId: 'priority-uuid',
};

// After
const createTaskDto: CreateTaskDto = {
  name: 'Test Task',
  description: 'Test Description',
  statusId: 'status-uuid',  // Fixed
  priorityId: 'priority-uuid',
};
```

## Implementation Steps

1. **Backup database** (if contains important data)
   ```bash
   # Export data
   npx prisma db pull
   ```

2. **Update Prisma schema**
   - Edit `prisma/schema.prisma`
   - Change `statudId` to `statusId`

3. **Generate migration**
   ```bash
   npx prisma migrate dev --name fix_task_statusid_typo
   ```

4. **Search and replace in code**
   ```bash
   # Find all occurrences
   grep -rn "statudId" src/

   # Replace in each file (manually or with sed)
   # Example for macOS:
   # find src/ -type f -exec sed -i '' 's/statudId/statusId/g' {} +
   # Example for Linux:
   # find src/ -type f -exec sed -i 's/statudId/statusId/g' {} +
   ```

5. **Regenerate Prisma client**
   ```bash
   npx prisma generate
   ```

6. **Update TypeScript imports**
   - VS Code may show errors until you restart TypeScript server
   - Command: "TypeScript: Restart TS Server"

7. **Run linter**
   ```bash
   yarn lint
   ```

8. **Build project**
   ```bash
   yarn build
   ```

9. **Test the application**
   ```bash
   yarn start:dev
   ```

10. **Verify API endpoints**
    - Test task creation with `statusId` field
    - Test task updates
    - Test task queries filtering by status

## Testing Checklist

After the fix, verify:
- [ ] Prisma schema uses `statusId`
- [ ] Database column renamed successfully
- [ ] Prisma client regenerated
- [ ] No references to `statudId` in codebase
- [ ] DTOs use `statusId`
- [ ] Service methods use `statusId`
- [ ] Swagger documentation shows `statusId`
- [ ] Application builds without errors
- [ ] Task creation works with `statusId`
- [ ] Task queries filter by `statusId`
- [ ] Existing data preserved after migration
- [ ] Tests pass (if tests exist)

## Validation Commands

```bash
# Search for remaining typos
grep -r "statudId" src/
grep -r "statudId" prisma/

# Should return no results

# Check migration status
npx prisma migrate status

# Verify schema
npx prisma validate

# Build project
yarn build

# Run app
yarn start:dev
```

## Rollback Plan (If Needed)

If something goes wrong:

```bash
# Revert the migration
npx prisma migrate resolve --rolled-back <migration-name>

# Or reset database (WARNING: loses all data)
npx prisma migrate reset
```

## Expected Outcome

After completion:
- ✅ Schema field named correctly as `statusId`
- ✅ Database column renamed
- ✅ All code references updated
- ✅ Prisma client types correct
- ✅ Application compiles and runs
- ✅ API works with correct field name
- ✅ No typos remaining in codebase

## Common Issues and Solutions

**Issue**: Migration fails with foreign key error
**Solution**: Check if there are existing tasks in the database. The migration should handle this automatically, but if it fails, you may need to manually update the constraint.

**Issue**: TypeScript errors after update
**Solution**: Restart TypeScript server and rebuild:
```bash
npx prisma generate
yarn build
# In VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

**Issue**: Seeding fails after migration
**Solution**: Update seeder files to use `statusId` instead of `statudId`

## References

- Prisma schema: `prisma/schema.prisma`
- Task service: `src/task/task.service.ts`
- Task DTOs: `src/task/dto/`
- Migration guide: https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate
