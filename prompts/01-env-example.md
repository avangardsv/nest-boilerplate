# Task: Create Comprehensive .env.example File

## Context
This NestJS boilerplate project currently has a minimal `.env.example` file with only basic configuration. We need a comprehensive environment configuration template that documents all required and optional environment variables with clear descriptions and examples.

## Current State
The existing `.env.example` contains:
- Database configuration (PostgreSQL)
- JWT secret
- Password salt
- Node environment
- Port configuration

## Requirements

### 1. Structure and Organization
Create a well-organized `.env.example` file with the following sections:
- **Application Configuration** - Basic app settings
- **Database Configuration** - PostgreSQL connection details
- **Authentication & Security** - JWT secrets, password hashing, token expiry
- **Server Configuration** - Port, CORS, rate limiting
- **Logging Configuration** - Log levels, formats
- **External Services** - Email, file storage (future-ready)

### 2. Documentation Standards
For each environment variable, provide:
- **Clear comment** explaining what it's used for
- **Example value** (safe/dummy data, never real credentials)
- **Required vs Optional** designation
- **Format/Type** indication where applicable (e.g., "comma-separated", "boolean", "number")
- **Default value** if the app has one

### 3. Required Variables to Include

#### Application
```
NODE_ENV - Environment (development, production, test)
PORT - Server port
APP_NAME - Application name for logging/monitoring
```

#### Database
```
DATABASE_URL - Full PostgreSQL connection string with schema
POSTGRES_USER - Database username
POSTGRES_PASSWORD - Database password
POSTGRES_DB - Database name
POSTGRES_HOST - Database host
POSTGRES_PORT - Database port
```

#### Authentication
```
JWT_SECRET - Secret key for signing JWT tokens (64+ characters recommended)
JWT_ACCESS_EXPIRATION - Access token expiration time
JWT_REFRESH_EXPIRATION - Refresh token expiration time
PASSWORD_SALT - Salt rounds for bcrypt password hashing
```

#### Security
```
CORS_ORIGIN - Allowed CORS origins (comma-separated)
RATE_LIMIT_TTL - Rate limit time window in seconds
RATE_LIMIT_MAX - Maximum requests per time window
```

#### Logging (Future-ready)
```
LOG_LEVEL - Logging level (error, warn, info, debug)
LOG_FORMAT - Log format (json, pretty)
```

#### External Services (Optional, for future features)
```
# Email Service (for password reset, verification)
SMTP_HOST - SMTP server host
SMTP_PORT - SMTP server port
SMTP_USER - SMTP username
SMTP_PASSWORD - SMTP password
SMTP_FROM - Default sender email address

# File Storage (for file uploads)
STORAGE_TYPE - Storage type (local, s3)
AWS_REGION - AWS region for S3
AWS_S3_BUCKET - S3 bucket name
AWS_ACCESS_KEY_ID - AWS access key
AWS_SECRET_ACCESS_KEY - AWS secret key
```

### 4. Format Example

Each variable should follow this format:
```bash
# Description of what this variable does
# Type: string/number/boolean/url
# Required: yes/no
# Default: value (if applicable)
# Example: example-value
VARIABLE_NAME=example-value
```

### 5. Security Notes Section

Add a prominent security notes section at the top:
```bash
# ==============================================================================
# ENVIRONMENT CONFIGURATION TEMPLATE
# ==============================================================================
#
# IMPORTANT SECURITY NOTES:
# 1. Never commit .env files to version control
# 2. Generate strong, unique secrets for JWT_SECRET (minimum 64 characters)
# 3. Use different secrets for each environment (dev, staging, production)
# 4. Rotate secrets periodically
# 5. Store production secrets in secure secret management systems
#
# SETUP INSTRUCTIONS:
# 1. Copy this file to .env: cp .env.example .env
# 2. Fill in all required values
# 3. Generate secure secrets for JWT_SECRET and PASSWORD_SALT
# 4. Update DATABASE_URL with your actual database credentials
#
# ==============================================================================
```

### 6. Value Generation Helper Comments

Include helper comments for generating secure values:
```bash
# Generate secure JWT secret:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate UUID:
# node -e "console.log(require('crypto').randomUUID())"
```

## Implementation Notes

1. **Backward Compatibility**: Keep existing variables from current `.env.example`
2. **Future-Ready**: Include commented-out optional variables for features that may be added later
3. **Clear Separation**: Use comment blocks to separate sections visually
4. **Consistency**: Use UPPER_SNAKE_CASE for all variable names
5. **Safe Examples**: Use obviously fake/example values (e.g., `your-secret-here`, `user@example.com`)

## Validation

After creating the file, verify:
- [ ] All current application code can find the variables it needs
- [ ] Variables match what's used in `src/config/` configuration service
- [ ] No real credentials or secrets included
- [ ] Comments are clear and helpful
- [ ] Examples are safe dummy values
- [ ] File is well-organized and easy to scan
- [ ] Security warnings are prominent

## Expected Output

Create a single `.env.example` file that:
- Documents all environment variables comprehensively
- Is well-organized with clear sections
- Includes helpful comments and examples
- Provides security guidance
- Is production-ready and professional

## References

- Current file: `.env.example`
- Configuration service: `src/config/`
- Database setup: `prisma/schema.prisma`
- Auth configuration: `src/auth/auth.module.ts`
