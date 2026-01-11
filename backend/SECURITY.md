# Security Guidelines

## Overview
This document outlines security best practices for the saas.tf backend API. All developers must follow these guidelines when contributing to the project.

---

## Table of Contents
1. [Authentication & Authorization](#authentication--authorization)
2. [Input Validation](#input-validation)
3. [Rate Limiting](#rate-limiting)
4. [Error Handling](#error-handling)
5. [Logging](#logging)
6. [Dependencies](#dependencies)
7. [Production Deployment](#production-deployment)
8. [Incident Response](#incident-response)

---

## Authentication & Authorization

### JWT Tokens
- **Location**: All JWT handling is in [src/services/auth.service.ts](src/services/auth.service.ts)
- **Best Practices**:
  - Never log JWT tokens
  - Tokens should only be transmitted via Authorization header
  - Token expiration is configured in JWT_EXPIRES_IN env var (default: 7 days)
  - Always verify tokens before granting access

### Password Management
- **Location**: [src/utils/crypto.ts](src/utils/crypto.ts)
- **Best Practices**:
  - Passwords are hashed with bcrypt (12 salt rounds)
  - Never log or expose passwords or hashes
  - Password requirements enforced via Joi schema:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - At least one special character

### Protected Routes
```typescript
// Always use authenticate middleware for protected routes
import { authenticate } from '../middleware/auth.middleware';

router.get('/protected', authenticate, controller.method);
```

---

## Input Validation

### Validation Schemas
- **Location**: [src/utils/validation.ts](src/utils/validation.ts)
- **Best Practices**:
  - ALL user input MUST be validated
  - Use Joi schemas for validation
  - Validation happens before business logic
  - Custom error messages for better UX

### Example
```typescript
import { validateBody } from '../middleware/validation.middleware';
import { createSubdomainSchema } from '../utils/validation';

router.post(
  '/subdomains',
  validateBody(createSubdomainSchema),
  controller.create
);
```

### Never Trust User Input
- Sanitize subdomain names (lowercase, trim)
- Validate IP addresses format
- Check against reserved subdomain list
- Limit request body size (10kb max)

---

## Rate Limiting

### Available Limiters
- **Location**: [src/middleware/rateLimiting.middleware.ts](src/middleware/rateLimiting.middleware.ts)

| Limiter | Limit | Window | Use Case |
|---------|-------|--------|----------|
| `globalLimiter` | 100 req | 15 min | All endpoints |
| `authLimiter` | 5 req | 15 min | Login/Register |
| `subdomainCreateLimiter` | 10 req | 1 hour | Subdomain creation |
| `subdomainCheckLimiter` | 30 req | 1 minute | Availability checks |

### Usage
```typescript
import { authLimiter } from '../middleware/rateLimiting.middleware';

router.post('/login', authLimiter, controller.login);
```

### Why Rate Limiting Matters
- Prevents brute force attacks on authentication
- Protects against DoS attacks
- Prevents DNS API quota exhaustion
- Reduces costs from excessive GCP DNS operations

---

## Error Handling

### Error Handler
- **Location**: [src/middleware/errorHandler.middleware.ts](src/middleware/errorHandler.middleware.ts)

### Best Practices
- Use custom AppError classes for operational errors
- Never expose stack traces in production
- Log all errors with context
- Return generic messages for unexpected errors

### Example
```typescript
import { BadRequestError } from '../utils/errors';

if (!isValid) {
  throw new BadRequestError('Invalid input', 'VALIDATION_ERROR');
}
```

### Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "timestamp": "2026-01-07T12:00:00Z"
  }
}
```

---

## Logging

### Logger
- **Location**: [src/utils/logger.ts](src/utils/logger.ts)
- **Transport**: Console (development), File (production)

### What to Log
✅ **DO LOG**:
- Request method, URL, IP address
- Authentication attempts (success/failure)
- Subdomain CRUD operations
- DNS operation results
- Error stack traces (server-side only)

❌ **NEVER LOG**:
- Passwords (plain or hashed)
- JWT tokens
- GCP service account credentials
- User personal data (GDPR compliance)

### Example
```typescript
import { logger } from '../utils/logger';

logger.info('User action', {
  userId: user.id,
  action: 'create_subdomain',
  subdomainName: name,
});

logger.error('Operation failed', {
  error: error.message,
  context: { userId, operation },
});
```

---

## Dependencies

### Dependency Management
- Regularly update dependencies: `npm audit`
- Review security advisories: `npm audit report`
- Pin major versions in package.json
- Use `npm ci` in production (not `npm install`)

### Security Scanning
```bash
# Check for vulnerabilities
npm audit

# Fix automatically (review changes first)
npm audit fix

# Fix breaking changes (review carefully)
npm audit fix --force
```

### Critical Dependencies
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT authentication
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting
- `joi` - Input validation
- `@google-cloud/dns` - DNS management

---

## Production Deployment

### Pre-Deployment Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Generate strong JWT_SECRET (minimum 32 characters)
- [ ] Configure DATABASE_URL with production credentials
- [ ] Set up GCP service account JSON
- [ ] Configure FRONTEND_URL for CORS
- [ ] Enable rate limiting (`RATE_LIMIT_ENABLED=true`)
- [ ] Set log level to 'info' or 'warn'
- [ ] Verify all environment variables are set
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Run full test suite: `npm test`
- [ ] Test with production-like data volume

### Environment Variables (Production)
```bash
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=<256-bit-random-string>
JWT_EXPIRES_IN=7d
GCP_PROJECT_ID=saas-tf-production
GCP_ZONE_NAME=saas-tf-zone
GCP_DNS_DOMAIN=saas.tf
GCP_SERVICE_ACCOUNT_JSON=<full-json>
FRONTEND_URL=https://saas.tf
RATE_LIMIT_ENABLED=true
LOG_LEVEL=info
```

### Generate Secure JWT Secret
```bash
# Option 1: OpenSSL
openssl rand -base64 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Incident Response

### Security Incident Procedure
1. **Detect**: Monitor logs and error reports
2. **Assess**: Determine scope and impact
3. **Contain**: Disable affected accounts/services if needed
4. **Remediate**: Fix vulnerability
5. **Document**: Record incident details
6. **Review**: Update security measures

### Common Issues

#### Brute Force Attack on /login
1. Check logs for repeated failed login attempts from same IP
2. Verify rate limiting is enabled
3. Consider temporarily blocking IP at infrastructure level
4. Notify affected users to change passwords

#### Suspicious Subdomain Creation
1. Check user account for compromised credentials
2. Review DNS records in GCP console
3. Delete malicious subdomains
4. Suspend user account pending investigation

#### JWT Token Leak
1. Immediately rotate JWT_SECRET
2. Invalidate all existing tokens (users must re-login)
3. Investigate how token was compromised
4. Notify affected users

#### GCP Service Account Compromise
1. Immediately rotate service account key in GCP
2. Update GCP_SERVICE_ACCOUNT_JSON environment variable
3. Review DNS zone for unauthorized changes
4. Enable GCP audit logs if not already enabled

---

## Security Contacts

### Reporting Vulnerabilities
- **Email**: security@saas.tf (TODO: Set up)
- **Response Time**: Within 24 hours
- **Responsible Disclosure**: 90 days before public disclosure

### Security Tools
- **SAST**: GitHub Advanced Security (enabled)
- **Dependency Scanning**: npm audit (weekly)
- **Penetration Testing**: Scheduled annually

---

## Security Training

### Required Reading
1. OWASP Top 10 (https://owasp.org/www-project-top-ten/)
2. JWT Best Practices (https://tools.ietf.org/html/rfc8725)
3. Node.js Security Checklist (https://blog.risingstack.com/node-js-security-checklist/)

### Code Review Checklist
Before approving any PR, verify:
- [ ] User input is validated
- [ ] Sensitive data is not logged
- [ ] Authentication/authorization is properly implemented
- [ ] Rate limiting is applied where appropriate
- [ ] Errors are handled without exposing sensitive info
- [ ] No hardcoded secrets or credentials
- [ ] Dependencies are up-to-date and secure
- [ ] Unit tests cover security-critical code

---

## Additional Resources
- [SECURITY_AUDIT.md](SECURITY_AUDIT.md) - Latest security audit report
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
