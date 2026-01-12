# saas.tf API Documentation

Base URL: `https://api.saas.tf/api/v1`

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Error Responses

All endpoints return errors in the following format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

Common error codes:
- `UNAUTHORIZED`: Missing or invalid authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input data
- `QUOTA_EXCEEDED`: Subdomain quota exceeded
- `CONFLICT`: Resource already exists
- `INTERNAL_SERVER_ERROR`: Server error

---

## Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### POST /auth/login
Login to existing account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### GET /auth/me
Get current authenticated user information.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Subdomain Endpoints

### GET /subdomains
Get all subdomains for the current user.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "subdomains": [
    {
      "id": "sub_123",
      "name": "myapp",
      "ipAddress": "192.168.1.1",
      "status": "ACTIVE",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "stats": {
    "total": 3,
    "active": 3,
    "inactive": 0
  },
  "total": 3,
  "quota": {
    "allowed": true,
    "used": 3,
    "total": 7,
    "plan": "PACKAGE_5",
    "subscriptions": [
      {
        "id": "sub_123",
        "plan": "PACKAGE_5",
        "quota": 7,
        "status": "ACTIVE"
      }
    ]
  }
}
```

---

### GET /subdomains/check/:name
Check if a subdomain name is available.

**Parameters:**
- `name`: Subdomain name to check (e.g., "myapp")

**Response:** `200 OK`
```json
{
  "available": true,
  "name": "myapp",
  "reason": null
}
```

Or if unavailable:
```json
{
  "available": false,
  "name": "www",
  "reason": "Subdomain 'www' is reserved"
}
```

---

### POST /subdomains
Create a new subdomain.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "myapp",
  "ipAddress": "192.168.1.1"
}
```

**Response:** `201 Created`
```json
{
  "subdomain": {
    "id": "sub_123",
    "name": "myapp",
    "ipAddress": "192.168.1.1",
    "status": "ACTIVE",
    "userId": "user_123",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### PUT /subdomains/:id
Update an existing subdomain.

**Headers:** `Authorization: Bearer <token>`

**Parameters:**
- `id`: Subdomain ID

**Request Body:**
```json
{
  "ipAddress": "192.168.1.2"
}
```

**Response:** `200 OK`
```json
{
  "subdomain": {
    "id": "sub_123",
    "name": "myapp",
    "ipAddress": "192.168.1.2",
    "status": "ACTIVE",
    "userId": "user_123",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

---

### DELETE /subdomains/:id
Delete a subdomain.

**Headers:** `Authorization: Bearer <token>`

**Parameters:**
- `id`: Subdomain ID

**Response:** `200 OK`
```json
{
  "message": "Subdomain deleted successfully"
}
```

---

## Subscription Endpoints

### GET /subscriptions
Get all user's subscriptions with quota information.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "subscriptions": [
    {
      "id": "sub_123",
      "userId": "user_123",
      "plan": "PACKAGE_5",
      "status": "ACTIVE",
      "stripeSubscriptionId": "sub_stripe_123",
      "stripeCustomerId": "cus_stripe_123",
      "currentPeriodStart": "2024-01-15T00:00:00.000Z",
      "currentPeriodEnd": "2025-01-15T00:00:00.000Z",
      "cancelAtPeriodEnd": false,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "totalQuota": 7,
  "totalUsed": 3,
  "breakdown": [
    {
      "source": "FREE",
      "quota": 2,
      "description": "Free tier"
    },
    {
      "source": "PACKAGE_5",
      "quota": 5,
      "description": "5 Subdomains Package"
    }
  ]
}
```

---

### GET /subscriptions/current
Get the current active subscription.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "subscription": {
    "id": "sub_123",
    "plan": "PACKAGE_5",
    "status": "ACTIVE",
    "stripeSubscriptionId": "sub_stripe_123",
    "currentPeriodStart": "2024-01-15T00:00:00.000Z",
    "currentPeriodEnd": "2025-01-15T00:00:00.000Z",
    "cancelAtPeriodEnd": false
  }
}
```

---

### GET /subscriptions/plans
Get all available subscription plans.

**Response:** `200 OK`
```json
{
  "plans": [
    {
      "id": "FREE",
      "name": "Free",
      "priceId": null,
      "price": 0,
      "subdomainQuota": 2,
      "features": [
        "2 subdomains",
        "Basic DNS management",
        "Community support"
      ]
    },
    {
      "id": "PACKAGE_5",
      "name": "5 Subdomains Package",
      "priceId": "price_...",
      "price": 1000,
      "subdomainQuota": 7,
      "features": [
        "5 extra subdomains",
        "Full DNS management",
        "Email support",
        "Valid for 1 year"
      ]
    },
    {
      "id": "PACKAGE_50",
      "name": "50 Subdomains Package",
      "priceId": "price_...",
      "price": 5000,
      "subdomainQuota": 52,
      "features": [
        "50 extra subdomains",
        "Full DNS management",
        "Priority email support",
        "Valid for 1 year"
      ]
    }
  ]
}
```

---

### POST /subscriptions/checkout
Create a Stripe checkout session for subscription purchase.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "plan": "PACKAGE_5"
}
```

**Response:** `200 OK`
```json
{
  "sessionUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_..."
}
```

---

### POST /subscriptions/portal
Create a Stripe billing portal session for subscription management.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "portalUrl": "https://billing.stripe.com/..."
}
```

---

### POST /subscriptions/cancel
Cancel a subscription.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "subscriptionId": "sub_123",
  "cancelAtPeriodEnd": true
}
```

**Response:** `200 OK`
```json
{
  "message": "Subscription canceled successfully",
  "subscription": {
    "id": "sub_123",
    "status": "ACTIVE",
    "cancelAtPeriodEnd": true,
    "currentPeriodEnd": "2025-01-15T00:00:00.000Z"
  }
}
```

---

### GET /subscriptions/quota
Check subdomain quota and availability.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "allowed": true,
  "used": 3,
  "quota": 7,
  "subscriptions": [
    {
      "id": "sub_123",
      "plan": "PACKAGE_5",
      "quota": 7,
      "status": "ACTIVE"
    }
  ]
}
```

---

## Webhook Endpoints

### POST /webhooks/stripe
Stripe webhook endpoint for subscription events.

**Headers:**
- `stripe-signature`: Stripe webhook signature

**Request Body:** Stripe event payload

**Response:** `200 OK`
```json
{
  "received": true
}
```

**Events Handled:**
- `checkout.session.completed`: New subscription created
- `customer.subscription.updated`: Subscription updated
- `customer.subscription.deleted`: Subscription canceled
- `invoice.payment_succeeded`: Payment successful
- `invoice.payment_failed`: Payment failed

---

## Health Check

### GET /health
Check API health status.

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "production"
}
```

---

## Rate Limiting

All endpoints are rate-limited to prevent abuse:
- **Global Limit**: 100 requests per 15 minutes per IP address
- **Auth Endpoints**: 5 requests per 15 minutes per IP address

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642246800
```

---

## Validation Rules

### Subdomain Names
- Must be 3-63 characters long
- Only lowercase letters, numbers, and hyphens
- Cannot start or end with a hyphen
- Cannot contain consecutive hyphens
- Reserved names are not allowed (www, api, mail, etc.)

### IP Addresses
- Must be a valid IPv4 address
- Format: `xxx.xxx.xxx.xxx`

### Email Addresses
- Must be a valid email format
- Maximum 255 characters

### Passwords
- Minimum 8 characters
- Must contain at least one letter and one number
- Maximum 128 characters

---

## Subscription Plans

### FREE
- **Price**: $0/year
- **Quota**: 2 subdomains
- **Features**: Basic DNS management, Community support

### PACKAGE_5
- **Price**: $10/year
- **Quota**: 7 subdomains (2 free + 5 purchased)
- **Features**: Full DNS management, Email support

### PACKAGE_50
- **Price**: $50/year
- **Quota**: 52 subdomains (2 free + 50 purchased)
- **Features**: Full DNS management, Priority support

---

## Examples

### Create Account and Subdomain
```bash
# 1. Register
curl -X POST https://api.saas.tf/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePass123",
    "name": "John Doe"
  }'

# Response: { "user": {...}, "token": "eyJ..." }

# 2. Create subdomain
curl -X POST https://api.saas.tf/api/v1/subdomains \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ..." \
  -d '{
    "name": "myapp",
    "ipAddress": "192.168.1.1"
  }'
```

### Purchase Subscription
```bash
# 1. Get available plans
curl https://api.saas.tf/api/v1/subscriptions/plans

# 2. Create checkout session
curl -X POST https://api.saas.tf/api/v1/subscriptions/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ..." \
  -d '{ "plan": "PACKAGE_5" }'

# 3. Redirect user to sessionUrl
```

### Manage Subscription
```bash
# View current subscription
curl https://api.saas.tf/api/v1/subscriptions/current \
  -H "Authorization: Bearer eyJ..."

# Access billing portal
curl -X POST https://api.saas.tf/api/v1/subscriptions/portal \
  -H "Authorization: Bearer eyJ..."

# Cancel subscription
curl -X POST https://api.saas.tf/api/v1/subscriptions/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ..." \
  -d '{
    "subscriptionId": "sub_123",
    "cancelAtPeriodEnd": true
  }'
```
