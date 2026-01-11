# 🚀 Production Deployment Checklist

**Use this checklist before deploying saas.tf to production.**

This comprehensive checklist ensures all security fixes, configurations, and verifications are complete before going live.

**Table of Contents:**
- [Pre-Deployment](#pre-deployment)
- [Phase 1: Security Fixes](#phase-1-security-fixes)
- [Phase 2: Infrastructure](#phase-2-infrastructure)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [External Services](#external-services)
- [DNS Configuration](#dns-configuration)
- [Testing & Verification](#testing--verification)
- [Post-Deployment](#post-deployment)
- [Rollback Plan](#rollback-plan)

---

## Pre-Deployment

### Repository Status
- [ ] All changes committed to git
- [ ] No uncommitted changes in working directory
- [ ] Production branch created (if using separate branches)
- [ ] All tests passing locally: `npm test` in both backend and frontend
- [ ] No TypeScript errors: `npx tsc --noEmit` in backend
- [ ] No linting errors: `npm run lint` in both services
- [ ] Build succeeds locally: `npm run build` in both services
- [ ] `.env` files NOT committed (verify with `git log -S "JWT_SECRET"`)

### Team Communication
- [ ] Deployment time communicated to team
- [ ] Maintenance window scheduled (if needed)
- [ ] Rollback plan reviewed and understood
- [ ] On-call person identified for post-deployment monitoring

---

## Phase 1: Security Fixes

### Rate Limiting
- [ ] Rate limiting forced ON in production ([backend/src/config/index.ts:42-51](backend/src/config/index.ts#L42-L51))
- [ ] Configuration validates correctly:
  ```typescript
  enabled: process.env.NODE_ENV === 'production' ? true : ...
  ```
- [ ] Rate limit values configured:
  - `RATE_LIMIT_WINDOW_MS=900000` (15 minutes)
  - `RATE_LIMIT_MAX_REQUESTS=100` (100 requests per window)

### HTTPS Enforcement
- [ ] HTTPS redirect middleware created ([backend/src/middleware/httpsRedirect.middleware.ts](backend/src/middleware/httpsRedirect.middleware.ts))
- [ ] Middleware applied in app.ts before CORS ([backend/src/app.ts:36](backend/src/app.ts#L36))
- [ ] X-Forwarded-Proto header check implemented
- [ ] Only applies in production mode

### FRONTEND_URL Validation
- [ ] Validation added to config startup ([backend/src/config/index.ts:75-92](backend/src/config/index.ts#L75-L92))
- [ ] Validates HTTPS protocol in production
- [ ] Validates not localhost in production
- [ ] Logs validation success

### Credential Security
- [ ] Read [CREDENTIAL_SECURITY.md](CREDENTIAL_SECURITY.md) completely
- [ ] All development credentials rotated (see below)
- [ ] Production credentials never committed to git
- [ ] `.env` files in `.gitignore` (line 17-21)

---

## Phase 2: Infrastructure

### Docker Configuration
- [ ] Backend Dockerfile exists ([backend/Dockerfile](backend/Dockerfile))
- [ ] Frontend Dockerfile exists ([frontend/Dockerfile](frontend/Dockerfile))
- [ ] Backend .dockerignore configured ([backend/.dockerignore](backend/.dockerignore))
- [ ] Frontend .dockerignore configured ([frontend/.dockerignore](frontend/.dockerignore))
- [ ] Multi-stage builds implemented (security + size optimization)
- [ ] Health checks configured in Dockerfiles
- [ ] Docker images build successfully:
  ```bash
  docker build -t saas-tf-backend ./backend
  docker build -t saas-tf-frontend ./frontend
  ```

### CI/CD Pipeline
- [ ] Backend CI workflow exists ([.github/workflows/backend-ci.yml](.github/workflows/backend-ci.yml))
- [ ] Frontend CI workflow exists ([.github/workflows/frontend-ci.yml](.github/workflows/frontend-ci.yml))
- [ ] GitHub Actions enabled for repository
- [ ] All CI checks passing on main branch
- [ ] Docker build steps included in CI

### Database Seeding
- [ ] Seed file created ([backend/prisma/seed.ts](backend/prisma/seed.ts))
- [ ] Package.json configured with seed script ([backend/package.json:63-65](backend/package.json#L63-L65))
- [ ] Seed uses upsert pattern (idempotent)
- [ ] Seeds 150+ reserved subdomains from constants

### Documentation
- [ ] Deployment guide exists ([DEPLOYMENT.md](DEPLOYMENT.md))
- [ ] Credential security guide exists ([CREDENTIAL_SECURITY.md](CREDENTIAL_SECURITY.md))
- [ ] README updated with production deployment links

---

## Environment Variables

### Backend Environment Variables

**Critical - Must Be Set:**
- [ ] `NODE_ENV=production`
- [ ] `PORT=4000` (or platform default)
- [ ] `DATABASE_URL` (PostgreSQL with `?sslmode=require`)
- [ ] `JWT_SECRET` (minimum 48 characters, base64)
  - [ ] **ROTATED from development** (generate: `openssl rand -base64 48`)
- [ ] `JWT_EXPIRES_IN=30d`
- [ ] `FRONTEND_URL=https://saas.tf` (HTTPS, not localhost)

**Google Cloud Platform:**
- [ ] `GCP_PROJECT_ID` (your GCP project)
- [ ] `GCP_ZONE_NAME` (your Cloud DNS zone)
- [ ] `GCP_DNS_DOMAIN=saas.tf`
- [ ] `GCP_SERVICE_ACCOUNT_JSON` (full JSON content or file path)
  - [ ] **Production service account created** (not development account)
  - [ ] Minimum permissions (DNS Administrator only)

**Stripe (LIVE MODE):**
- [ ] `STRIPE_SECRET_KEY=sk_live_...` (**NOT** sk_test_)
- [ ] `STRIPE_WEBHOOK_SECRET=whsec_...` (from production webhook)
- [ ] `STRIPE_PRICE_ID_PACKAGE_5=price_...` (live price ID)
- [ ] `STRIPE_PRICE_ID_PACKAGE_50=price_...` (live price ID)
- [ ] **Dashboard in LIVE MODE** (top-right toggle)

**SendGrid:**
- [ ] `SENDGRID_API_KEY=SG.xxxxx` (production key)
  - [ ] **API key rotated** from development
  - [ ] Full Access or Mail Send permissions
- [ ] `SENDGRID_FROM_EMAIL=noreply@saas.tf`
  - [ ] **Sender email verified** in SendGrid dashboard

**Rate Limiting (Auto-enabled in production):**
- [ ] `RATE_LIMIT_WINDOW_MS=900000` (15 minutes)
- [ ] `RATE_LIMIT_MAX_REQUESTS=100`

**Logging:**
- [ ] `LOG_LEVEL=info` (not debug in production)

**Optional but Recommended:**
- [ ] `SENTRY_DSN=https://...@sentry.io/...` (error tracking)

### Frontend Environment Variables

**Required:**
- [ ] `NEXT_PUBLIC_API_URL=https://api.saas.tf/api/v1` (HTTPS, points to backend)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...` (**NOT** pk_test_)
- [ ] `NEXT_PUBLIC_APP_NAME=saas.tf`
- [ ] `NEXT_PUBLIC_DOMAIN=saas.tf`

### Verification Commands

**Backend:**
```bash
# Test configuration loads correctly
NODE_ENV=production \
FRONTEND_URL=https://saas.tf \
DATABASE_URL=your-db-url \
JWT_SECRET=your-48-char-secret \
... \
npm start

# Should see:
# "Production environment validated - Frontend URL: https://saas.tf"
# "Server running on port 4000"
# "Database connection test successful"
```

**Frontend:**
```bash
# Test build with production env vars
NEXT_PUBLIC_API_URL=https://api.saas.tf/api/v1 \
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... \
npm run build

# Should succeed with no errors
# Should create .next/standalone directory
```

---

## Database Setup

### Migration
- [ ] Database created on hosting platform (Railway/Render)
- [ ] `DATABASE_URL` connection string obtained
- [ ] SSL mode enabled: `?sslmode=require`
- [ ] Strong database password (16+ characters)
- [ ] Database accessible from backend service
- [ ] Migrations applied:
  ```bash
  npx prisma migrate deploy
  ```
- [ ] Prisma Client generated:
  ```bash
  npx prisma generate
  ```

### Seeding
- [ ] Reserved subdomains seeded:
  ```bash
  npx prisma db seed
  ```
- [ ] Expected output: "Created: 150" reserved subdomains
- [ ] Verify seed:
  ```bash
  npx prisma studio
  # Or: psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"ReservedSubdomain\";"
  # Expected: 150+
  ```

### Backup
- [ ] Automatic backups enabled (Railway/Render have this by default)
- [ ] Backup retention policy understood
- [ ] Manual backup tested (pre-deployment)
- [ ] Restore procedure documented

---

## External Services

### Stripe Configuration

**Dashboard Setup:**
- [ ] Logged into Stripe Dashboard
- [ ] Switched to **LIVE MODE** (top-right toggle)
- [ ] Test mode keys NOT used in production

**Product & Pricing:**
- [ ] Products created in live mode:
  - [ ] Package 5 (5 subdomains)
  - [ ] Package 50 (50 subdomains)
- [ ] Recurring prices configured (monthly)
- [ ] Price IDs copied to backend environment variables

**Webhook Configuration:**
- [ ] Webhook endpoint created in live mode
- [ ] Endpoint URL: `https://api.saas.tf/api/v1/webhooks/stripe`
- [ ] Events selected:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
- [ ] Signing secret obtained (`whsec_...`)
- [ ] Signing secret set in `STRIPE_WEBHOOK_SECRET`

**Testing:**
- [ ] Test webhook delivery from Stripe Dashboard
- [ ] Backend logs show successful webhook processing
- [ ] Test payment in live mode (use real card with $1 charge)

### SendGrid Configuration

**API Key:**
- [ ] Production API key generated
- [ ] Name: "saas.tf Production"
- [ ] Permissions: Full Access or Mail Send
- [ ] API key stored securely in environment variables

**Sender Authentication:**
- [ ] Sender email verified: `noreply@saas.tf`
- [ ] Domain authentication configured (optional but recommended):
  - [ ] DNS records added (CNAME for SendGrid)
  - [ ] Domain verified in SendGrid dashboard

**Email Templates:**
- [ ] Purchase confirmation email tested
- [ ] Email formatting looks correct
- [ ] All links in email work correctly
- [ ] Unsubscribe link present (if required)

**Testing:**
- [ ] Test email sent from production backend
- [ ] Email received successfully
- [ ] Not in spam folder
- [ ] SendGrid Activity shows delivered status

### Google Cloud Platform

**Project Setup:**
- [ ] GCP project created: `saas-tf-production`
- [ ] Cloud DNS API enabled
- [ ] Billing account linked

**DNS Zone:**
- [ ] DNS zone created: `saas-tf-zone`
- [ ] Domain verified: `saas.tf`
- [ ] Nameservers configured with domain registrar

**Service Account:**
- [ ] Service account created: `saas-tf-production@...`
- [ ] Minimum permissions: DNS Administrator
- [ ] JSON key downloaded
- [ ] JSON key set in `GCP_SERVICE_ACCOUNT_JSON`
- [ ] Key stored securely (not committed to git)

**Testing:**
- [ ] Manual DNS record creation tested
- [ ] Record visible in GCP DNS console
- [ ] Record resolvable via `dig` or `nslookup`

---

## DNS Configuration

### Domain Registrar
- [ ] Domain purchased: `saas.tf`
- [ ] Nameservers pointed to GCP Cloud DNS
- [ ] Nameserver propagation complete (check: `dig NS saas.tf`)

### Root Domain (saas.tf → Frontend)
- [ ] A record configured:
  ```
  Type: A
  Host: @
  Value: 76.76.21.21 (Vercel)
  TTL: 3600
  ```
- [ ] CNAME record for www:
  ```
  Type: CNAME
  Host: www
  Value: cname.vercel-dns.com
  TTL: 3600
  ```
- [ ] Vercel custom domain added: `saas.tf` and `www.saas.tf`
- [ ] SSL certificate issued automatically by Vercel

### API Subdomain (api.saas.tf → Backend)
- [ ] CNAME record configured:
  ```
  Type: CNAME
  Host: api
  Value: your-backend.up.railway.app (or .onrender.com)
  TTL: 3600
  ```
- [ ] Backend platform custom domain configured
- [ ] SSL certificate issued

### DNS Verification
```bash
# Check root domain
dig saas.tf
# Should return Vercel IP: 76.76.21.21

# Check www subdomain
dig www.saas.tf
# Should return CNAME to Vercel

# Check API subdomain
dig api.saas.tf
# Should return CNAME to backend platform

# Test HTTPS
curl https://saas.tf
# Should return HTML (no redirect loop)

curl https://api.saas.tf/health
# Should return JSON health check
```

### Propagation
- [ ] DNS propagation complete (24-48 hours max)
- [ ] Verified from multiple locations: https://dnschecker.org

---

## Testing & Verification

### Pre-Deployment Testing

**Backend:**
```bash
# Run all tests
cd backend && npm test

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build

# Start production mode locally
NODE_ENV=production npm start
```

**Frontend:**
```bash
# Run tests (if any)
cd frontend && npm test

# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build

# Verify standalone output
ls -la .next/standalone
```

**Docker:**
```bash
# Build images
docker build -t test-backend ./backend
docker build -t test-frontend ./frontend

# Run with docker-compose
docker-compose up -d
docker-compose ps
# All services should be "healthy"

# Test health checks
curl http://localhost:4000/health
curl http://localhost:3000

# Clean up
docker-compose down
```

### Post-Deployment Verification

**Health Checks:**
- [ ] Backend health: `curl https://api.saas.tf/health`
  - [ ] Returns 200 status
  - [ ] Database status: "healthy"
  - [ ] Response time < 500ms
- [ ] Frontend loads: `curl https://saas.tf`
  - [ ] Returns 200 status
  - [ ] HTML content returned

**Security Headers:**
```bash
# Check security headers
curl -I https://api.saas.tf/health

# Should include:
# - Strict-Transport-Security (HSTS)
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - Content-Security-Policy
```

**HTTPS Enforcement:**
```bash
# Test HTTP redirect
curl -I http://api.saas.tf/health
# Should return 301 redirect to HTTPS
```

**Rate Limiting:**
```bash
# Test rate limiting (send 101 requests rapidly)
for i in {1..101}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://api.saas.tf/health
done
# After 100 requests, should return 429 (Too Many Requests)
```

**Authentication Flow:**
- [ ] Register new user
  - [ ] Validation works correctly
  - [ ] Password hashed (check database)
  - [ ] JWT token returned
- [ ] Login existing user
  - [ ] Correct password authenticates
  - [ ] Wrong password rejected
  - [ ] JWT token returned
- [ ] Authenticated requests
  - [ ] Valid token accepted
  - [ ] Invalid token rejected (401)
  - [ ] Expired token rejected (401)

**Subdomain Management:**
- [ ] Create subdomain
  - [ ] Validation works (length, format, reserved)
  - [ ] DNS record created in GCP
  - [ ] Subdomain saved in database
  - [ ] Quota decremented
- [ ] Update subdomain
  - [ ] Target URL validated
  - [ ] DNS record updated in GCP
  - [ ] Database updated
- [ ] Delete subdomain
  - [ ] DNS record removed from GCP
  - [ ] Database record deleted
  - [ ] Quota restored

**Quota Enforcement:**
- [ ] Free tier starts with 1 subdomain
- [ ] Creating subdomain decrements quota
- [ ] Creating when quota=0 returns 403
- [ ] Deleting subdomain restores quota

**Subscription Flow:**
- [ ] Stripe checkout session created
- [ ] Redirects to Stripe checkout
- [ ] Test payment completes (use real card with small amount)
- [ ] Webhook received and processed
- [ ] Subscription saved in database
- [ ] Quota updated correctly (5 or 50)
- [ ] Email notification sent
- [ ] Email received and looks correct

**Error Handling:**
- [ ] Invalid requests return proper error JSON
- [ ] Error codes correct (400, 401, 403, 404, 500)
- [ ] Error messages helpful but not leaking sensitive info
- [ ] Errors logged (check backend logs)
- [ ] Sentry captures errors (if configured)

---

## Post-Deployment

### Immediate Monitoring (First Hour)
- [ ] Watch backend logs in real-time
  - Railway: `railway logs`
  - Render: Dashboard → Logs
- [ ] Watch frontend logs in Vercel dashboard
- [ ] Monitor error rate in Sentry (if configured)
- [ ] Check Stripe webhook delivery success rate
- [ ] Check SendGrid delivery rate

### First 24 Hours
- [ ] No critical errors in logs
- [ ] No failed Stripe webhooks
- [ ] Emails being delivered successfully
- [ ] DNS records resolving correctly
- [ ] SSL certificates valid
- [ ] Rate limiting working correctly
- [ ] Database queries performing well (no timeouts)

### Performance Baseline
- [ ] Measure and document baseline metrics:
  - [ ] Average response time for health check
  - [ ] Average response time for subdomain creation
  - [ ] Average response time for authenticated requests
  - [ ] Database query performance
  - [ ] Memory usage
  - [ ] CPU usage

### User Acceptance Testing
- [ ] Complete end-to-end user journey:
  1. [ ] Visit https://saas.tf
  2. [ ] Register new account
  3. [ ] Verify logged in state
  4. [ ] Create a subdomain
  5. [ ] Verify DNS record exists
  6. [ ] Test subdomain redirect works
  7. [ ] Upgrade subscription (use real payment)
  8. [ ] Receive confirmation email
  9. [ ] Create additional subdomains (within quota)
  10. [ ] Update subdomain target URL
  11. [ ] Delete subdomain
  12. [ ] Logout
  13. [ ] Login again

### Communication
- [ ] Announce successful deployment to team
- [ ] Share production URL with stakeholders
- [ ] Document any issues encountered during deployment
- [ ] Update internal documentation with production URLs and credentials location

---

## Rollback Plan

### When to Rollback
Rollback immediately if:
- Critical security vulnerability discovered
- Data loss or corruption occurring
- Service completely unavailable for >15 minutes
- Payment processing failures
- Critical bugs affecting core functionality

### Rollback Steps

**1. Immediate Actions:**
- [ ] Communicate to team: "Initiating rollback"
- [ ] Stop deployment if in progress

**2. Application Rollback:**

**Railway/Render:**
- [ ] Navigate to deployment history
- [ ] Select previous stable deployment
- [ ] Click "Rollback" or "Redeploy"
- [ ] Wait for deployment to complete

**Vercel:**
- [ ] Navigate to Deployments
- [ ] Find previous production deployment
- [ ] Click "Promote to Production"

**3. Database Rollback (if needed):**
- [ ] **WARNING:** Only if migrations were run
- [ ] Restore database from backup taken pre-deployment
- [ ] Or manually revert migrations:
  ```bash
  npx prisma migrate resolve --rolled-back <migration-name>
  ```

**4. Environment Variables:**
- [ ] Revert any environment variable changes
- [ ] Ensure old credentials still valid
- [ ] Restart services if needed

**5. DNS Changes (if made):**
- [ ] Revert DNS records to previous values
- [ ] Wait for TTL to expire (usually 5-60 minutes)
- [ ] Or temporarily reduce TTL for faster changes

**6. Verification:**
- [ ] Service is accessible
- [ ] Core functionality works
- [ ] No errors in logs
- [ ] Users can access application

**7. Post-Rollback:**
- [ ] Document what went wrong
- [ ] Analyze root cause
- [ ] Create fix plan
- [ ] Test fix in staging/local
- [ ] Schedule new deployment attempt

### Rollback Testing
- [ ] **Before deployment:** Take database backup
- [ ] **Before deployment:** Test rollback procedure in staging
- [ ] **Before deployment:** Ensure previous deployment is tagged/saved

---

## Sign-Off

### Technical Review
- [ ] **Backend lead** reviewed and approved
- [ ] **Frontend lead** reviewed and approved
- [ ] **DevOps/Infrastructure** reviewed and approved

### Security Review
- [ ] All Phase 1 security fixes verified
- [ ] All credentials rotated and secure
- [ ] No secrets in git history
- [ ] Rate limiting enabled
- [ ] HTTPS enforced
- [ ] CORS configured correctly

### Business Sign-Off
- [ ] **Product owner** aware of deployment
- [ ] **Support team** briefed on new features
- [ ] **Marketing** ready for launch (if applicable)

---

## Final Checklist

Before clicking "Deploy":
- [ ] ✅ All items above checked
- [ ] ✅ Tests passing
- [ ] ✅ CI/CD green
- [ ] ✅ Credentials rotated
- [ ] ✅ Environment variables set
- [ ] ✅ Database migrated and seeded
- [ ] ✅ Stripe live mode configured
- [ ] ✅ SendGrid configured and verified
- [ ] ✅ DNS configured
- [ ] ✅ Rollback plan ready
- [ ] ✅ Team notified
- [ ] ✅ Monitoring in place

**Deployment Date:** _________________
**Deployed By:** _________________
**Deployment Start Time:** _________________
**Deployment End Time:** _________________
**Status:** ⬜ Success ⬜ Partial ⬜ Rolled Back

---

## Resources

- [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed deployment guide
- [CREDENTIAL_SECURITY.md](CREDENTIAL_SECURITY.md) - Credential rotation guide
- [Railway Docs](https://docs.railway.app/)
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [SendGrid Dashboard](https://app.sendgrid.com)
- [GCP Console](https://console.cloud.google.com)

---

**Last Updated:** January 11, 2026
**Version:** 1.0.0
**Phase 2 Complete:** ✅

**Next Steps After Production:**
- Phase 3: Monitoring & Error Tracking (Sentry, enhanced logging)
- Phase 4: Production Optimization (ownership validation, API docs)
- Phase 5: Testing & Verification (E2E tests, performance benchmarks)
