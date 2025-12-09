# Task: Implement Database Seeders with Preset System

## Context
This NestJS + Prisma project needs a comprehensive database seeding system for local development and testing. The system should provide different data volume presets and support cleanup operations.

## Current State
- Database schema defined in `prisma/schema.prisma`
- Models: User, Company, Project, Task, Status, Priority
- `package.json` has placeholder seed script: `"seed": "db:reset && ts-node src/seeders/seed.ts"`
- No actual seeder implementation exists
- Admin user is currently created in `user.service.ts` OnModuleInit (should be moved to seeders)

## Requirements

### 1. Seeder Architecture

Create a modular seeding system in `src/seeders/` directory with:

```
src/seeders/
├── seed.ts              # Main entry point with CLI
├── seed-runner.ts       # Orchestrates all seeders
├── data/                # Static seed data
│   ├── statuses.data.ts
│   ├── priorities.data.ts
│   └── admin.data.ts
├── seeders/
│   ├── user.seeder.ts
│   ├── company.seeder.ts
│   ├── project.seeder.ts
│   ├── task.seeder.ts
│   ├── status.seeder.ts
│   └── priority.seeder.ts
└── utils/
    ├── faker-helpers.ts  # Helper functions for generating realistic data
    └── preset-config.ts  # Configuration for different presets
```

### 2. Preset System

Implement four data volume presets:

**Small Preset** (Quick testing):
- 1 admin user
- 3 regular users
- 3 statuses (To Do, In Progress, Done)
- 3 priorities (Low, Medium, High)
- 5 companies
- 10 projects
- 25 tasks

**Medium Preset** (Normal development):
- 1 admin user
- 10 regular users
- 5 statuses
- 5 priorities
- 15 companies
- 30 projects
- 100 tasks

**Large Preset** (Performance testing):
- 1 admin user
- 50 regular users
- 7 statuses
- 7 priorities
- 50 companies
- 100 projects
- 500 tasks

**XL Preset** (Stress testing):
- 1 admin user
- 200 regular users
- 10 statuses
- 10 priorities
- 200 companies
- 500 projects
- 2000 tasks

### 3. CLI Interface

The main `seed.ts` should provide a command-line interface:

```bash
# Run with default (medium) preset
yarn seed

# Run with specific preset
yarn seed --preset small
yarn seed --preset medium
yarn seed --preset large
yarn seed --preset xl

# Cleanup all seeded data (keep schema)
yarn seed:cleanup

# Reset database and seed
yarn db:reset
```

### 4. Seeder Implementation Details

#### Base Seeder Interface
Each seeder should implement:
```typescript
interface Seeder {
  seed(count: number): Promise<void>;
  cleanup(): Promise<void>;
}
```

#### Status Seeder
- Create predefined statuses (To Do, In Progress, Code Review, Testing, Done, Blocked, Cancelled)
- Use consistent UUIDs for predictable data
- Should be idempotent (don't create duplicates)

#### Priority Seeder
- Create predefined priorities (Lowest, Low, Medium, High, Highest, Critical, Blocker)
- Use consistent UUIDs for predictable data
- Should be idempotent

#### User Seeder
- **Admin user**: Fixed credentials for testing
  - Email: `admin@example.com`
  - Password: `Admin123!`
  - Name: `Admin User`
  - isAdmin: true
- **Regular users**: Generated with realistic data
  - Use faker for names, emails
  - Password: `Password123!` (same for all test users for easy login)
  - isAdmin: false
  - Mix of first/last name combinations

#### Company Seeder
- Generate companies with realistic names
- Randomly assign owners from seeded users
- Varied company names (Tech, Consulting, Agency, etc.)

#### Project Seeder
- Generate projects with realistic names
- Associate with existing companies
- Project names should indicate their company

#### Task Seeder
- Generate tasks with realistic titles and descriptions
- Randomly assign:
  - Status (from seeded statuses)
  - Priority (from seeded priorities)
  - Assignee (can be null for unassigned tasks)
  - Reporter (always set, from seeded users)
- Vary task complexity and description lengths
- Include some tasks without assignees

### 5. Data Generation Guidelines

Use `@faker-js/faker` library for realistic data:
```typescript
import { faker } from '@faker-js/faker';

// Examples:
faker.company.name()           // Company names
faker.person.fullName()        // User names
faker.internet.email()         // Email addresses
faker.lorem.sentence()         // Task titles
faker.lorem.paragraph()        // Task descriptions
faker.word.words(3)           // Project names
```

### 6. Execution Order

Seeders must run in dependency order:
1. Status seeder (no dependencies)
2. Priority seeder (no dependencies)
3. User seeder (no dependencies)
4. Company seeder (depends on User)
5. Project seeder (depends on Company)
6. Task seeder (depends on User, Status, Priority)

### 7. Cleanup Strategy

The cleanup function should:
- Delete in reverse dependency order (tasks → projects → companies → users → priorities → statuses)
- Use Prisma's `deleteMany()` for efficiency
- Optionally preserve the admin user (add flag `--keep-admin`)
- Log progress for each model cleaned

### 8. Error Handling

- Wrap each seeder in try-catch
- Log detailed error messages with context
- Rollback on failure (delete partially seeded data)
- Provide clear user feedback on success/failure

### 9. Console Output

Provide informative output:
```
🌱 Starting database seeding...
   Preset: medium

✓ Seeded 5 statuses
✓ Seeded 5 priorities
✓ Seeded 11 users (1 admin, 10 regular)
✓ Seeded 15 companies
✓ Seeded 30 projects
✓ Seeded 100 tasks

🎉 Seeding completed successfully!
   Total records: 166
```

### 10. Performance Considerations

- Use `prisma.createMany()` for bulk inserts where possible
- Batch large operations (e.g., create tasks in batches of 100)
- Show progress for long-running operations
- Optimize queries to avoid N+1 problems

## Implementation Steps

1. Install faker library: `yarn add -D @faker-js/faker`
2. Create directory structure in `src/seeders/`
3. Implement preset configuration
4. Create base seeder interface/class
5. Implement individual seeders (status, priority, user, company, project, task)
6. Create seed runner to orchestrate execution
7. Implement CLI with argument parsing
8. Add cleanup functionality
9. Update package.json scripts
10. Test all presets
11. Document usage in README

## Package.json Scripts

Update to:
```json
{
  "seed": "ts-node -r tsconfig-paths/register src/seeders/seed.ts",
  "seed:small": "yarn seed --preset small",
  "seed:medium": "yarn seed --preset medium",
  "seed:large": "yarn seed --preset large",
  "seed:xl": "yarn seed --preset xl",
  "seed:cleanup": "ts-node -r tsconfig-paths/register src/seeders/seed.ts --cleanup",
  "db:reset": "npx prisma migrate reset --skip-seed && yarn seed"
}
```

## Validation Checklist

After implementation, verify:
- [ ] All four presets run without errors
- [ ] Data relationships are correctly established (no orphaned records)
- [ ] Cleanup removes all seeded data
- [ ] Admin user credentials are documented and work
- [ ] Seeding is idempotent (running twice doesn't cause errors)
- [ ] Large and XL presets complete in reasonable time
- [ ] Console output is clear and helpful
- [ ] Generated data is realistic and varied
- [ ] No hardcoded passwords in source (use constants)

## Security Notes

- Use obviously test/fake credentials (never real ones)
- Document that seed data is for development only
- Add warning comment that seeded passwords are intentionally weak
- Never run seeders in production environments

## Expected Outcome

A production-ready seeding system that:
- Generates realistic test data quickly
- Supports multiple data volumes for different testing needs
- Is easy to use via simple CLI commands
- Provides clear feedback and error messages
- Can be extended easily with new seeders
- Follows NestJS and Prisma best practices

## References

- Prisma schema: `prisma/schema.prisma`
- User service with admin creation: `src/user/user.service.ts`
- Package.json: `package.json`
