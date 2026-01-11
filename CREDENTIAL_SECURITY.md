# Credential Security Guide

## ✅ Security Status

**Current Protection:**
- ✅ `.env` files are in `.gitignore` (line 17-21)
- ✅ GCP credentials protected (line 24-25)
- ✅ Rate limiting forced ON in production
- ✅ FRONTEND_URL validated on startup
- ✅ HTTPS redirect enabled in production

---

## 🔐 Credential Rotation Checklist

### Before Production Deployment

All development credentials must be rotated before going to production:

#### 1. JWT Secret (CRITICAL)
```bash
# Generate new secure JWT secret (minimum 32 characters)
openssl rand -base64 48

# Update in production environment variables
JWT_SECRET=<generated-secret>
```

**Where to set:**
- Vercel: Project Settings → Environment Variables
- Railway: Project → Variables
- Render: Dashboard → Environment

#### 2. Stripe Keys
**Action Required:** Switch from test mode to live mode

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Toggle from "Test mode" to "Live mode" (top right)
3. Get live keys:
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `STRIPE_PUBLISHABLE_KEY=pk_live_...`
4. Create live webhook endpoint
5. Copy live webhook secret: `STRIPE_WEBHOOK_SECRET=whsec_...`

**⚠️ Important:** Test keys (sk_test_, pk_test_) will not work in production!

#### 3. SendGrid API Key
**Action Required:** Generate production API key

1. Log in to [SendGrid](https://app.sendgrid.com)
2. Navigate to: Settings → API Keys
3. Create New API Key
4. Name: `saas.tf Production`
5. Permissions: **Full Access** (or Mail Send only)
6. Copy and store: `SENDGRID_API_KEY=SG.xxxxx`

**⚠️ Note:** You can only see the key once - store it securely!

#### 4. Database Credentials
**Action Required:** Use production database credentials

For PostgreSQL (Railway/Render):
```
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
```

**Security:**
- Use strong password (16+ characters)
- Enable SSL connection (`?sslmode=require`)
- Restrict network access (if possible)

#### 5. GCP Service Account
**Action Required:** Create production service account

1. Go to [GCP Console](https://console.cloud.google.com)
2. IAM & Admin → Service Accounts
3. Create new service account: `saas-tf-production`
4. Grant minimal permissions:
   - DNS Administrator (for Cloud DNS)
5. Create JSON key
6. Either:
   - Upload to hosting platform as file
   - Or set as `GCP_SERVICE_ACCOUNT_JSON` environment variable

---

## 🚫 What NOT to Do

### NEVER:
- ❌ Commit `.env` files to git
- ❌ Share API keys in Slack/email/chat
- ❌ Use test keys in production
- ❌ Use production keys in development
- ❌ Store credentials in code comments
- ❌ Log sensitive data (passwords, tokens, API keys)

### ALWAYS:
- ✅ Use environment variables
- ✅ Rotate credentials every 90 days
- ✅ Use different credentials for dev/staging/production
- ✅ Revoke compromised credentials immediately
- ✅ Use hosting platform's secret management
- ✅ Enable 2FA on all accounts (Stripe, SendGrid, GCP, etc.)

---

## 📋 Production Environment Variables Checklist

**Backend (.env in hosting platform):**
```bash
# Server
NODE_ENV=production
PORT=4000

# Database
DATABASE_URL=postgresql://...

# JWT (Generate new!)
JWT_SECRET=<48-character-base64-string>
JWT_EXPIRES_IN=30d

# GCP
GCP_PROJECT_ID=saas-tf-production
GCP_ZONE_NAME=saas-tf-zone
GCP_DNS_DOMAIN=saas.tf
GCP_SERVICE_ACCOUNT_JSON=<full-json-content>

# Stripe (Live mode!)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PACKAGE_5=price_live_...
STRIPE_PRICE_ID_PACKAGE_50=price_live_...

# SendGrid
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@saas.tf

# CORS
FRONTEND_URL=https://saas.tf

# Rate Limiting (automatically ON in production)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info

# Monitoring (optional)
SENTRY_DSN=https://...
```

**Frontend (.env.production):**
```bash
NEXT_PUBLIC_API_URL=https://api.saas.tf/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_APP_NAME=saas.tf
NEXT_PUBLIC_DOMAIN=saas.tf
```

---

## 🔄 Regular Maintenance Schedule

### Every 90 Days
- [ ] Rotate JWT_SECRET
- [ ] Rotate database password
- [ ] Review and rotate API keys
- [ ] Audit access logs

### Every 6 Months
- [ ] Review GCP service account permissions
- [ ] Update dependencies (`npm audit fix`)
- [ ] Review Stripe webhook security

### Annually
- [ ] Full security audit
- [ ] Update all production credentials
- [ ] Review access controls

---

## 🚨 Emergency Procedures

### If Credentials Are Compromised:

1. **Immediately revoke compromised credentials**
   - Stripe: Dashboard → API Keys → Delete
   - SendGrid: Settings → API Keys → Delete
   - GCP: IAM → Service Accounts → Disable/Delete

2. **Generate new credentials**
   - Follow rotation checklist above

3. **Update production environment**
   - Deploy with new credentials
   - Test all integrations

4. **Investigate breach**
   - Check git history: `git log -S "sk_live_"`
   - Review access logs
   - Notify team if needed

5. **Document incident**
   - What was compromised
   - How it happened
   - Steps taken
   - Prevention measures

---

## 🔍 How to Audit Credentials

### Check for leaked secrets in git:
```bash
# Check for Stripe keys
git log -S "sk_test_" --all
git log -S "sk_live_" --all

# Check for JWT secrets
git log -S "JWT_SECRET" --all

# Check for API keys
git log -S "SG." --all
```

### If secrets found in git history:
1. **Rotate ALL compromised credentials immediately**
2. Consider rewriting git history (dangerous!)
3. Or make repository private
4. Update all team members

---

## ✅ Verification

Before production deployment, verify:
```bash
# Backend - Test startup with production ENV
NODE_ENV=production FRONTEND_URL=https://saas.tf ... npm start

# Should see:
# - "Production environment validated - Frontend URL: https://saas.tf"
# - No errors about missing variables
# - Rate limiting forced ON

# Frontend - Test build
npm run build

# Should succeed without errors
```

---

## 📚 Resources

- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Stripe API Keys Best Practices](https://stripe.com/docs/keys#limit-access)
- [SendGrid Security Best Practices](https://sendgrid.com/docs/for-developers/sending-email/api-keys/)
- [GCP Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-for-securing-service-accounts)

---

**Last Updated:** January 10, 2026
**Status:** All Phase 1 security fixes complete ✅
