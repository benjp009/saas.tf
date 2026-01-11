# 🚀 Deployment Guide for saas.tf

Complete guide for deploying saas.tf to production.

**Table of Contents:**
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Platform-Specific Guides](#platform-specific-guides)
- [Database Setup](#database-setup)
- [DNS Configuration](#dns-configuration)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts
- [ ] [Railway](https://railway.app) or [Render](https://render.com) account (Backend hosting)
- [ ] [Vercel](https://vercel.com) account (Frontend hosting)
- [ ] [Google Cloud Platform](https://cloud.google.com) project (DNS management)
- [ ] [Stripe](https://stripe.com) account (Payments)
- [ ] [SendGrid](https://sendgrid.com) account (Email notifications)
- [ ] PostgreSQL database (provided by Railway/Render or external)

### Required Tools
- [ ] [Git](https://git-scm.com/) installed
- [ ] [Node.js 18+](https://nodejs.org/) installed
- [ ] [Docker](https://docker.com) installed (optional, for local testing)
- [ ] [Stripe CLI](https://stripe.com/docs/stripe-cli) installed (for webhook testing)

### Completed Setup Steps
- [ ] Phase 1: Critical Security Fixes complete ✅
- [ ] All credentials rotated (see [CREDENTIAL_SECURITY.md](CREDENTIAL_SECURITY.md))
- [ ] Domain purchased and DNS configured
- [ ] GCP service account created with DNS permissions

---

## Quick Start

### 1. Prepare Repository
```bash
# Clone repository
git clone <your-repo-url>
cd saas.tf

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure Environment Variables
Create production environment variables in your hosting platforms (see [Environment Variables](#environment-variables) section).

### 3. Deploy Backend
Deploy to Railway or Render (see platform-specific guides below).

### 4. Deploy Frontend
Deploy to Vercel (see platform-specific guide below).

### 5. Run Database Migrations & Seeding
```bash
# Via Railway/Render dashboard or CLI
npx prisma migrate deploy
npx prisma db seed
```

### 6. Configure Stripe Webhooks
Point Stripe webhooks to your production backend URL.

### 7. Verify Deployment
Run through [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md).

---

## Environment Variables

### Backend Environment Variables

**Required:**
```bash
# Server
NODE_ENV=production
PORT=4000

# Database (provided by Railway/Render)
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# JWT Authentication
JWT_SECRET=<48-character-base64-secret>  # Generate: openssl rand -base64 48
JWT_EXPIRES_IN=30d

# Google Cloud Platform
GCP_PROJECT_ID=your-gcp-project-id
GCP_ZONE_NAME=your-dns-zone-name
GCP_DNS_DOMAIN=saas.tf
GCP_SERVICE_ACCOUNT_JSON=<full-json-content>

# Stripe (LIVE MODE - not test!)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PACKAGE_5=price_...
STRIPE_PRICE_ID_PACKAGE_50=price_...

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
```

**Optional:**
```bash
# Sentry (Recommended for error tracking)
SENTRY_DSN=https://...@sentry.io/...
```

### Frontend Environment Variables

**Required:**
```bash
NEXT_PUBLIC_API_URL=https://api.saas.tf/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_APP_NAME=saas.tf
NEXT_PUBLIC_DOMAIN=saas.tf
```

---

## Platform-Specific Guides

### Option 1: Railway (Backend) + Vercel (Frontend)

#### Backend on Railway

1. **Create New Project:**
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your repository
   - Select `backend` as the root directory

2. **Add PostgreSQL:**
   - In project dashboard, click "New"
   - Select "Database" → "PostgreSQL"
   - Railway will automatically set `DATABASE_URL`

3. **Configure Environment Variables:**
   - Go to project → Variables
   - Add all backend environment variables (see list above)
   - `DATABASE_URL` is already set by Railway

4. **Configure Build:**
   - Railway auto-detects Dockerfile
   - Or add these settings:
     ```
     Build Command: npm run build
     Start Command: npm start
     ```

5. **Deploy:**
   - Railway deploys automatically on push to main
   - Or click "Deploy" button
   - Note the public URL (e.g., `https://saas-backend-production.up.railway.app`)

6. **Run Database Migrations:**
   - In Railway dashboard → project → "Deploy" tab
   - Click "..." → "Run a Command"
   - Run: `npx prisma migrate deploy`
   - Then run: `npx prisma db seed`

#### Frontend on Vercel

1. **Import Project:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"
   - Import your Git repository
   - Select `frontend` as the root directory

2. **Configure Build Settings:**
   - Framework Preset: Next.js
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`

3. **Add Environment Variables:**
   - In project settings → Environment Variables
   - Add all frontend environment variables
   - Set `NEXT_PUBLIC_API_URL` to your Railway backend URL

4. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy automatically
   - Your site will be live at `https://your-project.vercel.app`

5. **Add Custom Domain:**
   - Project Settings → Domains
   - Add `saas.tf` and `www.saas.tf`
   - Follow DNS configuration instructions

---

### Option 2: Render (Backend) + Vercel (Frontend)

#### Backend on Render

1. **Create New Web Service:**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select your repository

2. **Configure Service:**
   ```
   Name: saas-tf-backend
   Region: Choose closest to users
   Branch: main
   Root Directory: backend
   Runtime: Docker
   ```

3. **Add PostgreSQL Database:**
   - In Render dashboard, click "New +" → "PostgreSQL"
   - Name: `saas-tf-db`
   - Copy the Internal Database URL
   - Add to web service environment variables as `DATABASE_URL`

4. **Add Environment Variables:**
   - In web service → Environment
   - Add all backend environment variables
   - Use Internal Database URL for `DATABASE_URL`

5. **Deploy:**
   - Click "Create Web Service"
   - Render builds and deploys automatically
   - Note the public URL (e.g., `https://saas-backend.onrender.com`)

6. **Run Database Migrations:**
   - Go to web service → Shell
   - Run: `npm run prisma:migrate`
   - Run: `npm run prisma:seed` (may need to add to package.json scripts)

#### Frontend on Vercel
Same as Railway + Vercel option above.

---

## Database Setup

### 1. Run Migrations
```bash
# Production migration (doesn't create migration files)
npx prisma migrate deploy
```

### 2. Seed Database
```bash
# Seeds 150+ reserved subdomains
npx prisma db seed
```

**Expected Output:**
```
🌱 Starting database seeding...
📋 Seeding 150+ reserved subdomains...
✅ Seeded reserved subdomains:
   - Created: 150
   - Updated: 0
   - Total: 150
🎉 Database seeding complete!
```

### 3. Verify Database
```bash
# Check database connection
npx prisma studio

# Or query directly
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"ReservedSubdomain\";"
# Expected: 150+
```

---

## DNS Configuration

### 1. Configure Root Domain (saas.tf)
Point your domain to Vercel:

```
Type: A
Host: @
Value: 76.76.21.21

Type: CNAME
Host: www
Value: cname.vercel-dns.com
```

### 2. Configure API Subdomain (api.saas.tf)
Point API subdomain to your backend:

**Railway:**
```
Type: CNAME
Host: api
Value: your-backend.up.railway.app
```

**Render:**
```
Type: CNAME
Host: api
Value: your-backend.onrender.com
```

### 3. Verify DNS
```bash
# Check root domain
dig saas.tf

# Check API subdomain
dig api.saas.tf

# Test API
curl https://api.saas.tf/health
```

---

## Post-Deployment

### 1. Configure Stripe Webhooks

1. **Login to Stripe Dashboard**
   - Go to https://dashboard.stripe.com
   - Switch to **LIVE MODE** (top right)

2. **Create Webhook Endpoint**
   - Go to Developers → Webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://api.saas.tf/api/v1/webhooks/stripe`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Click "Add endpoint"

3. **Copy Webhook Secret**
   - Click on the webhook
   - Reveal signing secret
   - Copy the `whsec_...` value
   - Update `STRIPE_WEBHOOK_SECRET` in your backend environment variables

4. **Test Webhook**
   - In Stripe Dashboard, click "Send test webhook"
   - Check your backend logs for successful processing

### 2. Verify SendGrid

1. **Test Email Sending**
   ```bash
   # Make a test purchase using Stripe test mode first
   # Then check your email inbox
   ```

2. **Check SendGrid Dashboard**
   - Go to https://app.sendgrid.com
   - Activity → Email Activity
   - Verify emails are being delivered

### 3. Monitor Logs

**Railway:**
```bash
# View real-time logs
railway logs
```

**Render:**
```bash
# View logs in dashboard
# Or use Render CLI
render logs
```

### 4. Run Health Checks

```bash
# Backend health
curl https://api.saas.tf/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "...",
  "environment": "production",
  "uptime": 123,
  "checks": {
    "database": "healthy"
  }
}

# Frontend
curl https://saas.tf
# Should return HTML
```

---

## Troubleshooting

### Backend Won't Start

**Check logs for specific errors:**

1. **"FRONTEND_URL must use HTTPS"**
   - Ensure `FRONTEND_URL=https://saas.tf` (not HTTP)

2. **"Missing required environment variable"**
   - Check all required variables are set
   - See [Environment Variables](#environment-variables)

3. **Database connection failed**
   - Verify `DATABASE_URL` is correct
   - Check database is running
   - Ensure `?sslmode=require` is in connection string

4. **"JWT_SECRET must be at least 32 characters"**
   - Generate new secret: `openssl rand -base64 48`

### Frontend Build Fails

1. **Environment variables missing**
   - All `NEXT_PUBLIC_*` vars must be set during build

2. **API not accessible**
   - Ensure `NEXT_PUBLIC_API_URL` points to deployed backend

3. **Standalone output missing**
   - Verify `next.config.js` has `output: 'standalone'`

### Stripe Webhooks Not Working

1. **Test webhook delivery:**
   - Stripe Dashboard → Webhooks → your endpoint
   - Click "Send test webhook"
   - Check response and logs

2. **Check webhook secret:**
   - Ensure `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard

3. **Verify endpoint URL:**
   - Must be `https://` (not HTTP)
   - Must be publicly accessible
   - Path must be exactly `/api/v1/webhooks/stripe`

### Emails Not Sending

1. **Check SendGrid status:**
   - Verify API key is valid
   - Check sender email is verified

2. **Check logs:**
   - Look for "Failed to send email" errors
   - Verify email service initialized

3. **Test SendGrid directly:**
   ```bash
   curl -X POST https://api.sendgrid.com/v3/mail/send \
     -H "Authorization: Bearer $SENDGRID_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"noreply@saas.tf"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}'
   ```

---

## Next Steps

After successful deployment:

1. **Complete** [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)
2. **Monitor** your application for 24-48 hours
3. **Set up** error tracking (Sentry recommended)
4. **Configure** database backups
5. **Test** complete user journey end-to-end
6. **Document** your deployment process for your team

---

## Support & Resources

- [Railway Docs](https://docs.railway.app/)
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Stripe Webhook Docs](https://stripe.com/docs/webhooks)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)

For issues, check:
- Backend logs (Railway/Render dashboard)
- Frontend logs (Vercel dashboard)
- [GitHub Issues](your-repo/issues)

---

**Last Updated:** January 10, 2026
**Version:** 1.0.0
