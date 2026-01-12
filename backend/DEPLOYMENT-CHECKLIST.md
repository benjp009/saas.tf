# Production Deployment Checklist

## Pre-Deployment Verification

### Phase 1: Core Infrastructure ✅
- [x] Express server setup with security middleware
- [x] PostgreSQL database with Prisma ORM
- [x] Google Cloud DNS integration
- [x] JWT authentication
- [x] Rate limiting
- [x] HTTPS enforcement
- [x] CORS configuration

### Phase 2: Payments & Subscriptions ✅
- [x] Stripe integration
- [x] Subscription management
- [x] Webhook handling
- [x] Quota enforcement
- [x] Multiple subscription support
- [x] Billing portal

### Phase 3: Monitoring & Error Tracking ✅
- [x] Sentry error tracking configured
- [x] Performance monitoring enabled
- [x] Winston logging with context
- [x] Slow request detection
- [x] Error context enrichment

### Phase 4: Production Optimization ✅
- [x] API documentation (API.md)
- [x] Ownership validation
- [x] Enhanced logging
- [x] Security best practices

### Phase 5: Testing & Verification ✅
- [x] End-to-end test suite
- [x] Performance benchmarks
- [x] Build verification

---

## Environment Variables Checklist

### Required for Production

```bash
# Server
NODE_ENV=production
PORT=4000

# Database (from Railway/Cloud SQL)
DATABASE_URL=postgresql://user:pass@host:5432/db

# JWT (Generate 256-bit secret)
JWT_SECRET=<generate-strong-secret-key>
JWT_EXPIRES_IN=7d

# Google Cloud Platform
GCP_PROJECT_ID=<your-project-id>
GCP_ZONE_NAME=<your-zone-name>
GCP_DNS_DOMAIN=saas.tf
GCP_SERVICE_ACCOUNT_JSON=<paste-full-json-content>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICE_ID_PACKAGE_5=price_...
STRIPE_PRICE_ID_PACKAGE_50=price_...

# Frontend
FRONTEND_URL=https://saas.tf

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info

# Sentry (Get from https://sentry.io)
SENTRY_DSN=https://...@sentry.io/...
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1

# SendGrid (Optional)
SENDGRID_API_KEY=SG.your-api-key
SENDGRID_FROM_EMAIL=noreply@saas.tf
```

---

## Pre-Deployment Steps

### 1. Security Validation
- [ ] JWT_SECRET is at least 32 characters (256 bits)
- [ ] All secrets are different from development
- [ ] FRONTEND_URL uses HTTPS
- [ ] Stripe keys are live mode (sk_live_*, pk_live_*)
- [ ] GCP service account has minimal permissions

### 2. Stripe Configuration
- [ ] Create Stripe products and prices
- [ ] Copy price IDs to env vars
- [ ] Configure webhook endpoint: `https://api.saas.tf/api/v1/webhooks/stripe`
- [ ] Test webhook signature verification
- [ ] Enable billing portal in Stripe dashboard

### 3. Sentry Setup
- [ ] Create Sentry project
- [ ] Copy DSN to env vars
- [ ] Test error tracking with test error
- [ ] Configure alert rules

### 4. Database Setup
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Verify database connection
- [ ] Create database backups
- [ ] Configure connection pooling

### 5. DNS Configuration
- [ ] Verify GCP zone exists
- [ ] Test DNS record creation
- [ ] Configure TTL settings
- [ ] Set up monitoring for DNS changes

---

## Deployment Steps

### Option 1: Google Cloud Run

```bash
# 1. Build Docker image
docker build -t gcr.io/[PROJECT-ID]/saas-tf-backend .

# 2. Push to Google Container Registry
docker push gcr.io/[PROJECT-ID]/saas-tf-backend

# 3. Deploy to Cloud Run
gcloud run deploy saas-tf-backend \
  --image gcr.io/[PROJECT-ID]/saas-tf-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="$(cat .env.production | tr '\n' ',')"

# 4. Configure custom domain
gcloud run domain-mappings create \
  --service saas-tf-backend \
  --domain api.saas.tf
```

### Option 2: Railway

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Link project
railway link

# 4. Set environment variables
railway variables set NODE_ENV=production
railway variables set DATABASE_URL="..."
# ... (set all env vars from above)

# 5. Deploy
railway up
```

### Option 3: Manual VPS (Ubuntu 22.04)

```bash
# 1. SSH into server
ssh user@your-server-ip

# 2. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PM2
sudo npm install -g pm2

# 4. Clone repository
git clone https://github.com/your-repo/saas-tf.git
cd saas-tf/backend

# 5. Install dependencies
npm install

# 6. Build
npm run build

# 7. Set environment variables
nano .env.production

# 8. Run migrations
npx prisma migrate deploy

# 9. Start with PM2
pm2 start dist/index.js --name saas-tf-backend
pm2 save
pm2 startup

# 10. Configure Nginx reverse proxy
sudo apt install nginx
sudo nano /etc/nginx/sites-available/saas-tf
```

Nginx configuration:
```nginx
server {
    listen 80;
    server_name api.saas.tf;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/saas-tf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.saas.tf
```

---

## Post-Deployment Verification

### 1. Health Check
```bash
curl https://api.saas.tf/health
# Expected: {"status":"healthy","timestamp":"...","environment":"production"}
```

### 2. API Endpoints
```bash
# Test registration
curl -X POST https://api.saas.tf/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'

# Test authentication
curl -X POST https://api.saas.tf/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'
```

### 3. Monitoring
- [ ] Check Sentry for errors
- [ ] Verify logs in cloud logging
- [ ] Test Stripe webhook delivery
- [ ] Monitor API response times

### 4. Security
- [ ] Run security scan (e.g., npm audit)
- [ ] Test rate limiting
- [ ] Verify HTTPS enforcement
- [ ] Test CORS headers

---

## Rollback Plan

### If deployment fails:

1. **Immediate rollback**:
   ```bash
   # Cloud Run
   gcloud run services update-traffic saas-tf-backend --to-revisions=PREVIOUS_REVISION=100

   # Railway
   railway rollback

   # PM2
   pm2 restart saas-tf-backend
   ```

2. **Database rollback**:
   ```bash
   # If migrations fail
   npx prisma migrate reset
   npx prisma migrate deploy
   ```

3. **DNS rollback**:
   - Revert DNS records via GCP console
   - Update Cloudflare/DNS provider

---

## Monitoring Dashboards

### 1. Sentry
- URL: https://sentry.io/projects/your-project
- Alerts: Email on critical errors
- Sample rate: 10%

### 2. Google Cloud Monitoring
- CPU usage
- Memory usage
- Request latency
- Error rate

### 3. Stripe Dashboard
- Failed payments
- Webhook failures
- Subscription metrics

---

## Maintenance Tasks

### Daily
- [ ] Check Sentry for new errors
- [ ] Monitor API response times
- [ ] Review failed payments

### Weekly
- [ ] Review logs for anomalies
- [ ] Check database performance
- [ ] Update dependencies (security patches)

### Monthly
- [ ] Database backup verification
- [ ] Security audit
- [ ] Performance optimization review
- [ ] Cost analysis

---

## Emergency Contacts

- **DevOps**: [Your contact]
- **Database**: [Your contact]
- **Stripe Support**: https://support.stripe.com
- **GCP Support**: https://cloud.google.com/support
- **Sentry Support**: https://sentry.io/support

---

## Additional Resources

- [API Documentation](./API.md)
- [Monitoring Setup](./MONITORING.md)
- [Stripe Integration Guide](https://stripe.com/docs)
- [GCP Cloud DNS Guide](https://cloud.google.com/dns/docs)
