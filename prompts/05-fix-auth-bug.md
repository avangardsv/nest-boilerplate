# Task: Fix Critical Authentication Bug - Password Comparison Logic

## Context
The authentication system has a critical bug in the sign-in logic that prevents users from logging in. The password comparison is fundamentally broken.

## Current State - THE BUG

Location: `src/auth/auth.service.ts` (approximately lines 48-54)

Current buggy code:
```typescript
async signIn(data: SignInDto) {
  // BUG: This hashes the password again and compares hash to hash
  const hashedPassword = await hash(password, this.configService.passwordSalt);

  const user = await this.userService.getOneByEmail(data.email);

  // This comparison will ALWAYS fail because:
  // 1. hashedPassword = hash(plaintext_password + salt)
  // 2. user.password = hash(plaintext_password + salt) [from signup]
  // 3. bcrypt produces different output each time, so hash !== hash
  if (!user || hashedPassword !== user.password) {
    throw new NotFoundException('Could not found user with provided credentials');
  }

  // ... rest of sign-in logic
}
```

### Why This Fails
1. During **signup**: Password is hashed using bcrypt → stored in database
2. During **sign-in**: Password is hashed AGAIN using bcrypt
3. Bcrypt includes a random salt in each hash, so `hash(password) !== hash(password)`
4. Comparison always fails, making login impossible

## Requirements

### 1. Fix the Password Comparison

Replace the buggy hash comparison with bcrypt's `compare()` function:

```typescript
import { hash, compare } from 'bcrypt';

async signIn(data: SignInDto) {
  const { email, password } = data;

  // 1. Find user by email
  const user = await this.userService.getOneByEmail(email);

  if (!user) {
    throw new UnauthorizedException('Invalid credentials');
  }

  // 2. Use bcrypt.compare() to verify password
  const isPasswordValid = await compare(password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedException('Invalid credentials');
  }

  // 3. Check if user is soft-deleted
  if (user.deletedAt) {
    throw new UnauthorizedException('Account has been deleted');
  }

  // 4. Generate and return tokens
  const payload = { sub: user.id, email: user.email };
  const accessToken = await this.jwtService.signAsync(payload);

  // TODO: Implement refresh token generation

  return {
    accessToken,
    // refreshToken: ... (implement when refresh token system is ready)
  };
}
```

### 2. Security Best Practices

Implement these security improvements:

#### A. Don't Reveal User Existence
```typescript
// BAD: Reveals if email exists
if (!user) throw new NotFoundException('User not found');
if (!isPasswordValid) throw new UnauthorizedException('Invalid password');

// GOOD: Generic error message
if (!user || !isPasswordValid) {
  throw new UnauthorizedException('Invalid credentials');
}
```

#### B. Timing Attack Protection
Use consistent timing regardless of whether user exists:

```typescript
async signIn(data: SignInDto) {
  const { email, password } = data;

  const user = await this.userService.getOneByEmail(email);

  // Always run compare even if user doesn't exist (constant time)
  const isPasswordValid = user
    ? await compare(password, user.password)
    : await compare(password, '$2b$10$dummyhashtopreventtiming'); // Dummy hash for timing consistency

  if (!user || !isPasswordValid || user.deletedAt) {
    throw new UnauthorizedException('Invalid credentials');
  }

  // ... rest of logic
}
```

#### C. Rate Limiting Consideration
Add TODO comment for future rate limiting:
```typescript
// TODO: Implement rate limiting to prevent brute force attacks
// Suggested: @nestjs/throttler with IP-based limiting
```

### 3. Update Sign-Up Logic (Verify It's Correct)

Ensure sign-up hashes password only once:

```typescript
async signUp(data: SignUpDto) {
  const { email, password, name } = data;

  // Check if user already exists
  const existingUser = await this.userService.getOneByEmail(email);
  if (existingUser) {
    throw new ConflictException('User with this email already exists');
  }

  // Hash password ONCE during signup
  const hashedPassword = await hash(password, this.configService.passwordSalt);

  // Create user with hashed password
  const user = await this.userService.create({
    email,
    name,
    password: hashedPassword,
  });

  // Don't return password in response
  delete user.password;

  return user;
}
```

### 4. Update Password Salt Configuration

Verify the password salt is a number (bcrypt rounds), not a string:

In `src/config/` (wherever PASSWORD_SALT is defined):
```typescript
get passwordSalt(): number {
  // bcrypt salt rounds should be a number (10-12 recommended)
  return Number(this.configService.get('PASSWORD_SALT')) || 10;
}
```

In `.env.example`:
```bash
# Password hashing salt rounds (10-12 recommended for production)
# Higher = more secure but slower
PASSWORD_SALT=10
```

### 5. Add Type Safety

Update the hash function call to use correct types:

```typescript
import { hash, compare } from 'bcrypt';

// Ensure saltRounds is a number
const hashedPassword = await hash(password, Number(this.configService.passwordSalt));

// bcrypt compare returns Promise<boolean>
const isPasswordValid: boolean = await compare(password, user.password);
```

### 6. Error Message Consistency

Update all auth error messages:

```typescript
// Sign In
throw new UnauthorizedException('Invalid credentials');

// Deleted account
throw new UnauthorizedException('Account has been deleted');

// Sign Up - existing user
throw new ConflictException('User with this email already exists');
```

### 7. Testing Requirements

After fixing, verify:

1. **Sign Up → Sign In Flow**
   ```bash
   # 1. Sign up a new user
   POST /auth/signup
   { "email": "test@example.com", "password": "Test123!", "name": "Test User" }

   # 2. Sign in with same credentials
   POST /auth/signin
   { "email": "test@example.com", "password": "Test123!" }

   # Should return access token
   ```

2. **Wrong Password**
   ```bash
   POST /auth/signin
   { "email": "test@example.com", "password": "WrongPassword!" }

   # Should return 401 Unauthorized
   ```

3. **Non-existent User**
   ```bash
   POST /auth/signin
   { "email": "nonexistent@example.com", "password": "Test123!" }

   # Should return 401 Unauthorized (same as wrong password)
   ```

4. **Deleted User**
   ```bash
   # Delete user first: DELETE /user/me
   # Then try to sign in
   POST /auth/signin
   { "email": "test@example.com", "password": "Test123!" }

   # Should return 401 Unauthorized
   ```

## Files to Modify

1. **src/auth/auth.service.ts** - Fix sign-in logic (PRIMARY FIX)
2. **src/config/** - Verify passwordSalt is number
3. **.env.example** - Document PASSWORD_SALT clearly

## Common Pitfalls to Avoid

❌ **Don't do this:**
```typescript
// Never compare hashed password to hashed password
if (hashedPassword === user.password)

// Never reveal which part is wrong
if (!user) throw new Error('Email not found');
if (!isPasswordValid) throw new Error('Password incorrect');

// Never use synchronous bcrypt functions in async context
const hashedPassword = hashSync(password, salt); // Use async hash() instead
```

✅ **Do this:**
```typescript
// Use bcrypt's compare function
const isPasswordValid = await compare(password, user.password);

// Generic error messages
throw new UnauthorizedException('Invalid credentials');

// Always use async bcrypt functions
const hashedPassword = await hash(password, saltRounds);
const isValid = await compare(password, hashedPassword);
```

## Validation Checklist

- [ ] Removed buggy hash comparison
- [ ] Using `bcrypt.compare()` correctly
- [ ] Password hashing only happens during sign-up
- [ ] Error messages don't reveal user existence
- [ ] Soft-deleted users cannot log in
- [ ] Password salt is a number (bcrypt rounds)
- [ ] Tested full sign-up → sign-in flow
- [ ] Tested with wrong password
- [ ] Tested with non-existent user
- [ ] Import statements include `compare` from bcrypt
- [ ] No synchronous bcrypt functions used

## Expected Outcome

After this fix:
- Users can successfully sign in with correct credentials
- Authentication flow works end-to-end
- Security best practices are followed
- Error messages are consistent and safe
- Code follows NestJS patterns

## References

- Auth service: `src/auth/auth.service.ts`
- User service: `src/user/user.service.ts`
- Config service: `src/config/`
- bcrypt documentation: https://www.npmjs.com/package/bcrypt
