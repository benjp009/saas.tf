# saas.tf API Documentation

**Version**: 1.0.0
**Base URL**: `http://localhost:4000/api/v1` (development)
**Production URL**: `https://api.saas.tf/api/v1`

---

## Table of Contents
1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [Error Responses](#error-responses)
4. [Endpoints](#endpoints)
   - [Authentication Endpoints](#authentication-endpoints)
   - [Subdomain Endpoints](#subdomain-endpoints)
5. [Response Formats](#response-formats)
6. [Status Codes](#status-codes)

---

## Authentication

### JWT Bearer Token
All protected endpoints require a JWT bearer token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Obtaining a Token
1. Register a new account via `POST /auth/register`
2. Login via `POST /auth/login`
3. Both endpoints return a `token` field in the response

### Token Expiration
- Default: 7 days
- Configurable via `JWT_EXPIRES_IN` environment variable
- Use `POST /auth/refresh` to get a new token before expiration

---

## Rate Limiting

| Endpoint Pattern | Limit | Window |
|-----------------|-------|--------|
| Global (all endpoints) | 100 requests | 15 minutes |
| `/auth/register`, `/auth/login` | 5 requests | 15 minutes |
| `POST /subdomains` | 10 requests | 1 hour |
| `GET /subdomains/check/:name` | 30 requests | 1 minute |

When rate limit is exceeded, the API returns HTTP 429 with:
```json
{
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Too many requests from this IP, please try again later",
    "timestamp": "2026-01-07T12:00:00Z"
  }
}
```

---

## Error Responses

### Error Format
All errors follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "timestamp": "2026-01-07T12:00:00Z"
  }
}
```

### Common Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `NO_TOKEN` | 401 | No authorization token provided |
| `AUTH_FAILED` | 401 | Authentication failed |
| `USER_NOT_FOUND` | 401 | User account not found |
| `CONFLICT` | 409 | Resource already exists |
| `EMAIL_EXISTS` | 409 | Email address already registered |
| `NOT_FOUND` | 404 | Resource not found |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

---

## Endpoints

## Authentication Endpoints

### POST /auth/register
Create a new user account.

**Authentication**: None
**Rate Limit**: 5 requests / 15 minutes

#### Request Body
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Validation Rules
- `email`: Valid email format, automatically lowercased
- `password`:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (@$!%*?&)
- `firstName`: Optional, max 50 characters
- `lastName`: Optional, max 50 characters

#### Success Response (201 Created)
```json
{
  "user": {
    "id": "clx123abc456",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2026-01-07T12:00:00Z",
    "updatedAt": "2026-01-07T12:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Error Responses
- `400 Bad Request`: Invalid email or weak password
- `409 Conflict`: Email already registered
- `429 Too Many Requests`: Rate limit exceeded

#### Example
```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

---

### POST /auth/login
Authenticate and receive a JWT token.

**Authentication**: None
**Rate Limit**: 5 requests / 15 minutes (only failed attempts counted)

#### Request Body
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Success Response (200 OK)
```json
{
  "user": {
    "id": "clx123abc456",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2026-01-07T12:00:00Z",
    "updatedAt": "2026-01-07T12:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Error Responses
- `400 Bad Request`: Missing email or password
- `401 Unauthorized`: Invalid credentials
- `429 Too Many Requests`: Too many failed login attempts

#### Example
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

---

### GET /auth/me
Get the currently authenticated user's information.

**Authentication**: Required
**Rate Limit**: Global (100/15min)

#### Success Response (200 OK)
```json
{
  "user": {
    "id": "clx123abc456",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2026-01-07T12:00:00Z",
    "updatedAt": "2026-01-07T12:00:00Z"
  }
}
```

#### Error Responses
- `401 Unauthorized`: Missing or invalid token

#### Example
```bash
curl -X GET http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### POST /auth/refresh
Generate a new JWT token (before current expires).

**Authentication**: Required
**Rate Limit**: Global (100/15min)

#### Success Response (200 OK)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Error Responses
- `401 Unauthorized`: Missing or invalid token

#### Example
```bash
curl -X POST http://localhost:4000/api/v1/auth/refresh \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### POST /auth/logout
Logout (client-side operation, token invalidation).

**Authentication**: Required
**Rate Limit**: Global (100/15min)

**Note**: Since JWT tokens are stateless, logout is primarily a client-side operation (delete the token). This endpoint confirms the action server-side for logging purposes.

#### Success Response (200 OK)
```json
{
  "message": "Logged out successfully"
}
```

#### Example
```bash
curl -X POST http://localhost:4000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Subdomain Endpoints

### GET /subdomains
List all subdomains for the authenticated user.

**Authentication**: Required
**Rate Limit**: Global (100/15min)

#### Success Response (200 OK)
```json
{
  "subdomains": [
    {
      "id": "clx123abc456",
      "name": "myapp",
      "fullDomain": "myapp.saas.tf",
      "ipAddress": "192.168.1.1",
      "isActive": true,
      "dnsRecordId": "myapp.saas.tf.",
      "expiresAt": null,
      "createdAt": "2026-01-07T12:00:00Z",
      "updatedAt": "2026-01-07T12:00:00Z"
    }
  ],
  "stats": {
    "total": 1,
    "active": 1,
    "inactive": 0
  },
  "total": 1,
  "quota": 100
}
```

#### Example
```bash
curl -X GET http://localhost:4000/api/v1/subdomains \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### GET /subdomains/check/:name
Check if a subdomain name is available.

**Authentication**: None
**Rate Limit**: 30 requests / minute

#### URL Parameters
- `name`: Subdomain name to check (3-63 characters, lowercase, alphanumeric + hyphens)

#### Success Response (200 OK) - Available
```json
{
  "available": true,
  "name": "myapp"
}
```

#### Success Response (200 OK) - Already Taken
```json
{
  "available": false,
  "name": "myapp",
  "reason": "already_taken"
}
```

#### Success Response (200 OK) - Reserved
```json
{
  "available": false,
  "name": "admin",
  "reason": "reserved"
}
```

#### Error Responses
- `400 Bad Request`: Invalid subdomain name format
- `429 Too Many Requests`: Rate limit exceeded

#### Example
```bash
curl -X GET http://localhost:4000/api/v1/subdomains/check/myapp
```

---

### POST /subdomains
Create a new subdomain and DNS A record.

**Authentication**: Required
**Rate Limit**: 10 requests / hour

#### Request Body
```json
{
  "name": "myapp",
  "ipAddress": "192.168.1.1"
}
```

#### Validation Rules
- `name`:
  - 3-63 characters
  - Lowercase letters, numbers, and hyphens only
  - Must start and end with alphanumeric character
  - Cannot contain consecutive hyphens
  - Cannot be a reserved name (admin, api, www, etc.)
- `ipAddress`: Valid IPv4 address format

#### Success Response (201 Created)
```json
{
  "subdomain": {
    "id": "clx123abc456",
    "name": "myapp",
    "fullDomain": "myapp.saas.tf",
    "ipAddress": "192.168.1.1",
    "isActive": true,
    "dnsRecordId": "myapp.saas.tf.",
    "expiresAt": null,
    "createdAt": "2026-01-07T12:00:00Z",
    "updatedAt": "2026-01-07T12:00:00Z",
    "userId": "clx123user"
  }
}
```

#### Error Responses
- `400 Bad Request`: Invalid name or IP address format
- `401 Unauthorized`: Missing or invalid authentication
- `409 Conflict`: Subdomain name already taken
- `429 Too Many Requests`: Creation rate limit exceeded
- `500 Internal Server Error`: DNS operation failed

#### Example
```bash
curl -X POST http://localhost:4000/api/v1/subdomains \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "myapp",
    "ipAddress": "192.168.1.1"
  }'
```

---

### PATCH /subdomains/:id
Update the IP address of an existing subdomain.

**Authentication**: Required
**Rate Limit**: Global (100/15min)

#### URL Parameters
- `id`: Subdomain ID

#### Request Body
```json
{
  "ipAddress": "192.168.1.100"
}
```

#### Validation Rules
- `ipAddress`: Valid IPv4 address format

#### Success Response (200 OK)
```json
{
  "subdomain": {
    "id": "clx123abc456",
    "name": "myapp",
    "fullDomain": "myapp.saas.tf",
    "ipAddress": "192.168.1.100",
    "isActive": true,
    "dnsRecordId": "myapp.saas.tf.",
    "expiresAt": null,
    "createdAt": "2026-01-07T12:00:00Z",
    "updatedAt": "2026-01-07T12:05:00Z",
    "userId": "clx123user"
  }
}
```

#### Error Responses
- `400 Bad Request`: Invalid IP address format
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Subdomain not found or not owned by user
- `500 Internal Server Error`: DNS update failed

#### Example
```bash
curl -X PATCH http://localhost:4000/api/v1/subdomains/clx123abc456 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ipAddress": "192.168.1.100"
  }'
```

---

### DELETE /subdomains/:id
Delete a subdomain and its DNS record.

**Authentication**: Required
**Rate Limit**: Global (100/15min)

#### URL Parameters
- `id`: Subdomain ID

#### Success Response (204 No Content)
No response body.

#### Error Responses
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Subdomain not found or not owned by user
- `500 Internal Server Error`: DNS deletion failed (subdomain is still deleted from database)

#### Example
```bash
curl -X DELETE http://localhost:4000/api/v1/subdomains/clx123abc456 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Response Formats

### Timestamp Format
All timestamps use ISO 8601 format with UTC timezone:
```
2026-01-07T12:00:00.000Z
```

### User Object
```json
{
  "id": "clx123abc456",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "createdAt": "2026-01-07T12:00:00Z",
  "updatedAt": "2026-01-07T12:00:00Z"
}
```

**Note**: `passwordHash` and `stripeCustomerId` are never included in responses.

### Subdomain Object
```json
{
  "id": "clx123abc456",
  "name": "myapp",
  "fullDomain": "myapp.saas.tf",
  "ipAddress": "192.168.1.1",
  "isActive": true,
  "dnsRecordId": "myapp.saas.tf.",
  "expiresAt": null,
  "createdAt": "2026-01-07T12:00:00Z",
  "updatedAt": "2026-01-07T12:00:00Z",
  "userId": "clx123user"
}
```

---

## Status Codes

| Status Code | Meaning | Usage |
|-------------|---------|-------|
| 200 OK | Success | GET, PATCH requests |
| 201 Created | Resource created | POST /auth/register, POST /subdomains |
| 204 No Content | Success, no body | DELETE /subdomains/:id |
| 400 Bad Request | Invalid input | Validation errors |
| 401 Unauthorized | Authentication required/failed | Missing/invalid token |
| 404 Not Found | Resource not found | Invalid route or subdomain ID |
| 409 Conflict | Resource already exists | Duplicate email or subdomain |
| 429 Too Many Requests | Rate limit exceeded | Too many requests |
| 500 Internal Server Error | Server error | Unexpected errors |

---

## Reserved Subdomain Names

The following subdomain names are reserved and cannot be used:

### System & Admin (10)
admin, administrator, root, system, support, help, staff, moderator, mod, operator

### API & Technical (20)
api, www, mail, smtp, pop, pop3, imap, ftp, ftps, sftp, ssh, vpn, proxy, cdn, static, assets, files, download, upload, data

### Services (25)
blog, forum, wiki, docs, documentation, dev, development, stage, staging, test, testing, demo, sandbox, preview, qa, uat, production, prod, app, application, service, services, backend, frontend, web

### Database & Infrastructure (10)
db, database, mysql, postgres, postgresql, mongodb, mongo, redis, cache, memcached

### Business & Operations (15)
billing, payment, payments, checkout, invoice, invoices, sales, dashboard, console, portal, admin-panel, cp, controlpanel, manage, manager

### Security & Auth (10)
auth, authentication, login, signin, signup, register, logout, password, account, accounts

### Communication (10)
email, webmail, newsletter, contact, feedback, helpdesk, chat, messaging, notifications, alerts

### Content & Media (10)
media, images, img, photos, videos, audio, music, files, downloads, assets

### Brand Protection (30)
google, facebook, amazon, microsoft, apple, stripe, paypal, twitter, instagram, linkedin, github, gitlab, bitbucket, slack, discord, zoom, shopify, square, mailchimp, sendgrid, twilio, aws, azure, gcp, cloudflare, heroku, vercel, netlify, digital-ocean, linode

**Total**: 150+ reserved names

To check if a name is reserved, use `GET /subdomains/check/:name`

---

## Changelog

### Version 1.0.0 (2026-01-07)
- Initial API release
- Authentication endpoints
- Subdomain CRUD operations
- Rate limiting
- Input validation
- Security headers

---

## Support

- **Documentation**: This file
- **Security**: See [SECURITY.md](SECURITY.md)
- **Issues**: Report bugs at https://github.com/your-org/saas.tf/issues
- **Email**: support@saas.tf (TODO: Set up)
