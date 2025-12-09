# Task: Implement Testing Patterns and Best Practices

## Context
The application currently lacks comprehensive test coverage. We need to establish testing patterns, create test utilities, and implement unit tests for services, controllers, and critical business logic.

## Current State
- No unit tests exist
- No test utilities or fixtures
- No testing patterns established
- No test coverage requirements

## Requirements

### 1. Install Required Dependencies

```bash
yarn add -D @nestjs/testing jest-mock-extended
```

### 2. Update Jest Configuration

Update `package.json` or create `jest.config.js`:

```javascript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/*.interface.ts',
    '!**/*.dto.ts',
    '!**/*.entity.ts',
    '!**/index.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
  },
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
```

### 3. Create Test Utilities

Create `src/test/utils/test-utils.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '../../config/config.service';

export class TestUtils {
  static async createTestingModule(providers: any[], imports: any[] = []) {
    const module: TestingModule = await Test.createTestingModule({
      imports,
      providers: [
        ...providers,
        {
          provide: PrismaService,
          useValue: this.createMockPrismaService(),
        },
        {
          provide: ConfigService,
          useValue: this.createMockConfigService(),
        },
      ],
    }).compile();

    return module;
  }

  static createMockPrismaService() {
    return {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      task: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };
  }

  static createMockConfigService() {
    return {
      jwtSecret: 'test-secret',
      jwtExpiresIn: '15m',
      passwordSaltRounds: 10,
      get: jest.fn(),
      getOrThrow: jest.fn(),
    };
  }
}
```

### 4. Create Test Fixtures

Create `src/test/fixtures/user.fixture.ts`:

```typescript
import { User } from '@prisma/client';

export const createMockUser = (overrides?: Partial<User>): User => {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    password: '$2b$10$hashedpassword',
    isAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
};

export const createMockUsers = (count: number): User[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockUser({
      id: `user-${i}`,
      email: `user${i}@example.com`,
      name: `User ${i}`,
    }),
  );
};
```

Create `src/test/fixtures/task.fixture.ts`:

```typescript
import { Task } from '@prisma/client';

export const createMockTask = (overrides?: Partial<Task>): Task => {
  return {
    id: 'test-task-id',
    name: 'Test Task',
    description: 'Test Description',
    status: 'pending',
    priority: 'medium',
    projectId: 'test-project-id',
    assignedToId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
};
```

### 5. Example: Service Test

Create `src/auth/auth.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '../config/config.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { createMockUser } from '../test/fixtures/user.fixture';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            getOneByEmail: jest.fn(),
            getOneById: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            refreshToken: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            jwtExpiresIn: '15m',
            passwordSaltRounds: 10,
          },
        },
        {
          provide: RefreshTokenService,
          useValue: {
            createRefreshToken: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
    prismaService = module.get(PrismaService);
  });

  describe('signIn', () => {
    it('should return tokens for valid credentials', async () => {
      const mockUser = createMockUser();
      const signInDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      userService.getOneByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('access-token');
      service['refreshTokenService'].createRefreshToken.mockResolvedValue('refresh-token');

      const result = await service.signIn(signInDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(userService.getOneByEmail).toHaveBeenCalledWith(signInDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(signInDto.password, mockUser.password);
    });

    it('should throw NotFoundException for invalid email', async () => {
      userService.getOneByEmail.mockResolvedValue(null);

      await expect(
        service.signIn({ email: 'invalid@example.com', password: 'password' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const mockUser = createMockUser();
      userService.getOneByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.signIn({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('signUp', () => {
    it('should create user and return tokens', async () => {
      const signUpDto = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      };
      const mockUser = createMockUser({ email: signUpDto.email });

      userService.create.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('access-token');
      service['refreshTokenService'].createRefreshToken.mockResolvedValue('refresh-token');

      const result = await service.signUp(signUpDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(userService.create).toHaveBeenCalled();
    });
  });
});
```

### 6. Example: Controller Test

Create `src/task/task.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { createMockTask } from '../test/fixtures/task.fixture';

describe('TaskController', () => {
  let controller: TaskController;
  let service: jest.Mocked<TaskService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        {
          provide: TaskService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TaskController>(TaskController);
    service = module.get(TaskService);
  });

  describe('findAll', () => {
    it('should return array of tasks', async () => {
      const mockTasks = [createMockTask(), createMockTask()];
      service.findAll.mockResolvedValue(mockTasks);

      const result = await controller.findAll({});

      expect(result).toEqual(mockTasks);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a task', async () => {
      const mockTask = createMockTask();
      service.findOne.mockResolvedValue(mockTask);

      const result = await controller.findOne('test-id');

      expect(result).toEqual(mockTask);
      expect(service.findOne).toHaveBeenCalledWith('test-id');
    });
  });
});
```

### 7. Integration Test Example

Create `src/test/integration/auth.integration.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/signup (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('refreshToken');
      });
  });

  it('/auth/signin (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/signin')
      .send({
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('refreshToken');
      });
  });
});
```

## Testing Best Practices

1. **AAA Pattern**: Arrange, Act, Assert
2. **Isolation**: Each test should be independent
3. **Mocking**: Mock external dependencies
4. **Fixtures**: Use fixtures for test data
5. **Coverage**: Aim for 50%+ coverage initially
6. **Naming**: Use descriptive test names
7. **One Assertion**: One concept per test

## Test Structure

```
src/
  auth/
    auth.service.spec.ts
    auth.controller.spec.ts
  task/
    task.service.spec.ts
    task.controller.spec.ts
  test/
    fixtures/
      user.fixture.ts
      task.fixture.ts
    utils/
      test-utils.ts
    integration/
      auth.integration.spec.ts
```

## Running Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:cov

# Run specific test file
yarn test auth.service.spec.ts
```

## Benefits

- Confidence in code changes
- Documentation through tests
- Early bug detection
- Refactoring safety
- Better code design

## References

- NestJS Testing: https://docs.nestjs.com/fundamentals/testing
- Jest Documentation: https://jestjs.io/docs/getting-started

