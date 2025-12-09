# Task: Implement Advanced Pagination Filters

## Context
The current pagination endpoints in this NestJS + Prisma boilerplate only support basic offset/limit pagination. We need to add comprehensive filtering, sorting, and search capabilities across all resource endpoints while maintaining type safety and reusability.

## Current State

Current pagination implementation:
- Basic `PaginationDto` with `offset` and `limit`
- No filtering capabilities
- No search functionality
- No sorting options
- Endpoints: Company, Project, Task, Status, Priority all use `POST /pagination`

## Requirements

### 1. Enhanced Pagination DTO Architecture

Create a layered DTO system:

```
src/common/dto/
├── base-pagination.dto.ts        # Base pagination (offset, limit)
├── search-pagination.dto.ts      # Adds search capability
├── sort-pagination.dto.ts        # Adds sorting capability
└── filter-pagination.dto.ts      # Adds filtering capability
```

### 2. Base Pagination DTO

Enhance existing `PaginationDto`:

```typescript
export class BasePaginationDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiProperty({ default: 0, description: 'Offset for pagination' })
  offset?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @ApiProperty({ default: 20, description: 'Limit per page (max 100)' })
  limit?: number;
}
```

### 3. Search Capability

Create `SearchPaginationDto`:

```typescript
export class SearchPaginationDto extends BasePaginationDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @ApiProperty({
    required: false,
    description: 'Search term to filter results (minimum 3 characters)',
    example: 'project name'
  })
  search?: string;
}
```

### 4. Sort Capability

Create flexible sorting system:

```typescript
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class SortOption {
  field: string;
  order: SortOrder;
}

// Sort format: "field:order" (e.g., "name:asc", "createdAt:desc")
export class SortPaginationDto extends SearchPaginationDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiProperty({
    required: false,
    description: 'Sorting options (format: field:order)',
    example: ['name:asc', 'createdAt:desc'],
    isArray: true,
  })
  sort?: string[];
}
```

### 5. Resource-Specific Filter DTOs

Create filter DTOs for each resource:

#### Task Filters
```typescript
export class TaskFilterDto extends SortPaginationDto {
  @IsOptional()
  @IsUUID()
  @ApiProperty({ required: false, description: 'Filter by status ID' })
  statusId?: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty({ required: false, description: 'Filter by priority ID' })
  priorityId?: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty({ required: false, description: 'Filter by assignee user ID' })
  assigneeId?: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty({ required: false, description: 'Filter by reporter user ID' })
  reporterId?: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ required: false, description: 'Filter unassigned tasks' })
  unassigned?: boolean;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ required: false, description: 'Filter by created after date' })
  createdAfter?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ required: false, description: 'Filter by created before date' })
  createdBefore?: string;
}
```

#### Project Filters
```typescript
export class ProjectFilterDto extends SortPaginationDto {
  @IsOptional()
  @IsUUID()
  @ApiProperty({ required: false, description: 'Filter by company ID' })
  companyId?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ required: false })
  createdAfter?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ required: false })
  createdBefore?: string;
}
```

#### Company Filters
```typescript
export class CompanyFilterDto extends SortPaginationDto {
  @IsOptional()
  @IsUUID()
  @ApiProperty({ required: false, description: 'Filter by owner user ID' })
  ownerId?: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ required: false, description: 'Show only companies I own' })
  myCompanies?: boolean;
}
```

### 6. Query Builder Helper

Create a reusable query builder utility:

```typescript
// src/common/utils/query-builder.util.ts

export class QueryBuilder {
  /**
   * Parses sort strings into Prisma orderBy format
   * Example: ["name:asc", "createdAt:desc"] -> [{ name: 'asc' }, { createdAt: 'desc' }]
   */
  static parseSortOptions(sort?: string[]): any[] {
    if (!sort || sort.length === 0) return [];

    return sort.map(sortStr => {
      const [field, order] = sortStr.split(':');
      return { [field]: order || 'asc' };
    });
  }

  /**
   * Builds search conditions for multiple fields
   * Returns OR condition for Prisma where clause
   */
  static buildSearchCondition(search: string, fields: string[]): any {
    if (!search) return {};

    return {
      OR: fields.map(field => ({
        [field]: { contains: search, mode: 'insensitive' }
      }))
    };
  }

  /**
   * Builds date range filter
   */
  static buildDateRangeFilter(after?: string, before?: string): any {
    const filter: any = {};
    if (after) filter.gte = new Date(after);
    if (before) filter.lte = new Date(before);
    return Object.keys(filter).length > 0 ? filter : undefined;
  }
}
```

### 7. Service Implementation Pattern

Update services to use filters:

```typescript
// Example: Task Service
async findAllWithFilters(
  filters: TaskFilterDto,
  currentUser: User,
): Promise<PaginatedResult<Task>> {
  const {
    offset = 0,
    limit = 20,
    search,
    sort,
    statusId,
    priorityId,
    assigneeId,
    reporterId,
    unassigned,
    createdAfter,
    createdBefore,
  } = filters;

  // Build where clause
  const where: Prisma.TaskWhereInput = {
    deletedAt: null, // Exclude soft-deleted
  };

  // Apply search across name and description
  if (search) {
    Object.assign(where, QueryBuilder.buildSearchCondition(search, ['name', 'description']));
  }

  // Apply filters
  if (statusId) where.statusId = statusId;
  if (priorityId) where.priorityId = priorityId;
  if (reporterId) where.reporterId = reporterId;

  if (unassigned) {
    where.assigneeId = null;
  } else if (assigneeId) {
    where.assigneeId = assigneeId;
  }

  // Apply date range
  const dateRange = QueryBuilder.buildDateRangeFilter(createdAfter, createdBefore);
  if (dateRange) where.createdAt = dateRange;

  // Parse sort options
  const orderBy = QueryBuilder.parseSortOptions(sort) || [{ createdAt: 'desc' }];

  // Execute query
  const [items, total] = await Promise.all([
    this.prisma.task.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit,
      include: {
        status: true,
        priority: true,
        assignee: { select: { id: true, name: true, email: true } },
        reporter: { select: { id: true, name: true, email: true } },
      },
    }),
    this.prisma.task.count({ where }),
  ]);

  return {
    items,
    total,
    offset,
    limit,
    hasMore: offset + limit < total,
  };
}
```

### 8. Controller Updates

Update controllers to use new DTOs:

```typescript
@Post('pagination')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Get paginated tasks with filters' })
async getAllTasksWithFilters(
  @Body() filters: TaskFilterDto,
  @CurrentUser() user: User,
): Promise<PaginatedResult<Task>> {
  return this.taskService.findAllWithFilters(filters, user);
}
```

### 9. Response Type

Create a standardized paginated response:

```typescript
export class PaginatedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}
```

### 10. Validation for Sort Fields

Add validation to ensure only valid fields can be sorted:

```typescript
export function ValidSortFields(allowedFields: string[]) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'validSortFields',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: `Sort field must be one of: ${allowedFields.join(', ')}`,
      },
      validator: {
        validate(value: string[]) {
          if (!value) return true;
          return value.every(sortStr => {
            const [field] = sortStr.split(':');
            return allowedFields.includes(field);
          });
        },
      },
    });
  };
}

// Usage:
@ValidSortFields(['name', 'createdAt', 'updatedAt', 'status', 'priority'])
sort?: string[];
```

## Implementation Scope

Apply filters to these endpoints:
1. **Tasks** - Full filtering (status, priority, assignee, reporter, dates, unassigned, search)
2. **Projects** - Company filter, date range, search
3. **Companies** - Owner filter, "my companies" filter, search
4. **Users** - Search by name/email (admin only)
5. **Status/Priority** - Search by name only

## Testing Requirements

For each filtered endpoint, test:
- Pagination works correctly
- Search filters results appropriately
- Multiple filters combine correctly (AND logic)
- Sorting works for all allowed fields
- Invalid sort fields are rejected
- Date range filters work correctly
- Empty results return proper structure
- Limits are enforced (max 100 per page)

## Swagger Documentation

Ensure Swagger docs show:
- All filter parameters with descriptions
- Example values for each parameter
- Allowed sort fields enumerated
- Response schema with pagination metadata

## Expected Outcomes

After implementation:
- All pagination endpoints support comprehensive filtering
- Search works across relevant text fields
- Flexible sorting on multiple fields
- Type-safe filter options
- Reusable utilities for future endpoints
- Clear API documentation
- Consistent response format across all resources

## References

- Current pagination: `src/common/dto/pagination.dto.ts`
- Task service: `src/task/task.service.ts`
- Company service: `src/company/company.service.ts`
- Project service: `src/project/project.service.ts`
- Prisma schema: `prisma/schema.prisma`
