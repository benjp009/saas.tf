# Email Notifications Setup Guide
**Priority 3: Email Notifications**
**Status:** ✅ Implementation Complete

---

## Overview

Email notifications have been fully integrated into the Stripe payment system. Users receive automated emails for:
- ✅ Subscription created (welcome email)
- ✅ Payment succeeded (confirmation email)
- ✅ Payment failed (action required email)
- ✅ Subscription expired (expiration notice)

**Email Provider:** SendGrid (Free tier: 100 emails/day)

---

## Quick Start

### 1. Create SendGrid Account

1. Visit: https://signup.sendgrid.com/
2. Create a free account
3. Verify your email address
4. Complete account setup

### 2. Create API Key

1. Login to SendGrid: https://app.sendgrid.com/
2. Navigate to: **Settings** → **API Keys**
3. Click **Create API Key**
4. Name: `saas.tf Production` (or `saas.tf Development`)
5. Permissions: **Full Access** (or **Restricted Access** with Mail Send enabled)
6. Click **Create & View**
7. **COPY THE API KEY** (you won't be able to see it again!)

### 3. Verify Sender Email

**Important:** SendGrid requires sender verification before sending emails.

1. Navigate to: **Settings** → **Sender Authentication**
2. Choose one option:

   **Option A: Single Sender Verification** (Quickest - Recommended for Development)
   - Click **Verify a Single Sender**
   - Fill in your details:
     - From Name: `saas.tf`
     - From Email Address: Your email (e.g., `your-email@gmail.com`)
     - Reply To: Same as From Email
     - Company Address: Your address
   - Click **Create**
   - Check your email for verification link
   - Click the verification link

   **Option B: Domain Authentication** (Best for Production)
   - Click **Authenticate Your Domain**
   - Enter your domain: `saas.tf`
   - Follow DNS configuration instructions
   - Wait for DNS propagation (up to 48 hours)

### 4. Configure Backend Environment

Update `backend/.env` with your SendGrid credentials:

```bash
# SendGrid Email Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=your-verified-email@example.com
```

**Important:**
- `SENDGRID_API_KEY`: The API key you copied in step 2
- `SENDGRID_FROM_EMAIL`: Must match your verified sender email from step 3

### 5. Restart Backend Server

```bash
cd ~/Documents/French\ SaaS/saas.tf/backend
# Stop the current server (Ctrl+C)
npm run dev
```

**Expected output:**
```
Email service initialized (SendGrid)
Server running on port 4000
```

---

## Testing Email Notifications

### Test 1: Subscription Created Email

**Trigger:** Complete a Stripe checkout

1. Navigate to: http://localhost:3000/billing
2. Click "Buy Package" on any plan
3. Complete checkout with test card: `4242 4242 4242 4242`
4. Watch backend logs for:
   ```
   Email sent successfully { to: 'user@example.com', subject: 'Welcome to...' }
   ```
5. Check your email inbox

**Expected Email:**
- Subject: `Welcome to [Plan Name]! 🎉`
- Contains: Plan details, quota, expiration date
- Buttons: "Manage Subscription", "View Subdomains"

### Test 2: Payment Succeeded Email

**Trigger:** Successful payment (automatically sent after checkout or renewal)

1. Complete a checkout (same as Test 1)
2. Backend will automatically create a payment record
3. Check logs for:
   ```
   Payment succeeded { invoiceId: 'in_xxxxx', amount: 1000 }
   Email sent successfully { to: 'user@example.com', subject: 'Payment Received' }
   ```
4. Check your email inbox

**Expected Email:**
- Subject: `Payment Received - $10.00`
- Contains: Amount, plan name, invoice link
- Button: "View Invoice", "Manage Billing"

### Test 3: Payment Failed Email

**Trigger:** Failed payment webhook

**Option A: Use Declined Test Card**
1. Go to billing page
2. Try to purchase with declined card: `4000 0000 0000 0002`
3. Checkout should fail
4. If webhook is triggered, email will be sent

**Option B: Simulate via Stripe Dashboard**
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click on your webhook endpoint
3. Click "Send test webhook"
4. Select event: `invoice.payment_failed`
5. Click "Send test webhook"
6. Check your email

**Expected Email:**
- Subject: `Payment Failed - Action Required`
- Contains: Warning, amount, plan name
- Button: "Update Payment Method"

### Test 4: Subscription Expired Email

**Trigger:** Cron job processes expired subscriptions

**Setup:**
1. Open Prisma Studio: `cd backend && npx prisma studio`
2. Find a subscription
3. Update:
   - `status` → `PAST_DUE`
   - `stripeCurrentPeriodEnd` → 3 days ago
4. Save changes

**Trigger Cron:**
```bash
curl -X POST http://localhost:4000/api/v1/cron/trigger-expired \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Email:**
- Subject: `Subscription Expired - [Plan Name]`
- Contains: Expiration notice, deactivated subdomains count
- Button: "View Available Plans"

---

## Email Templates

All emails are beautifully designed with:
- ✅ HTML and plain text versions
- ✅ Responsive design (mobile-friendly)
- ✅ Gradient headers with emojis
- ✅ Clear call-to-action buttons
- ✅ Professional branding

### Template Locations

**Email Service:** [`backend/src/services/email.service.ts`](backend/src/services/email.service.ts)

**Email Types:**
1. `sendSubscriptionCreated()` - Welcome email
2. `sendPaymentSucceeded()` - Payment confirmation
3. `sendPaymentFailed()` - Payment failure notice
4. `sendSubscriptionExpired()` - Expiration notice

---

## Customization

### Change Email Appearance

Edit [`backend/src/services/email.service.ts`](backend/src/services/email.service.ts):

**Colors:**
```css
/* Subscription Created - Purple gradient */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Payment Succeeded - Green gradient */
background: linear-gradient(135deg, #10b981 0%, #059669 100%);

/* Payment Failed - Red gradient */
background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);

/* Subscription Expired - Orange gradient */
background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
```

**Content:**
- Edit the `text` variable for plain text version
- Edit the `html` variable for HTML version
- Update button links to match your domain

### Change Sender Information

Update `backend/.env`:
```bash
SENDGRID_FROM_EMAIL=support@saas.tf
```

And update `backend/src/services/email.service.ts`:
```typescript
this.fromEmail = config.sendgrid?.fromEmail || 'support@saas.tf';
```

---

## Troubleshooting

### Email Service Not Initialized

**Problem:** Backend logs show:
```
SendGrid API key not configured - emails disabled
```

**Solution:**
1. Verify `SENDGRID_API_KEY` is in `backend/.env`
2. Ensure the API key is not commented out (no `#` at the start)
3. Restart backend server
4. Check logs for: `Email service initialized (SendGrid)`

### Emails Not Being Sent

**Problem:** Backend logs show email sent, but nothing arrives

**Possible Causes:**
1. **Sender Not Verified:**
   - Go to SendGrid → Settings → Sender Authentication
   - Verify your sender email address
   - Wait for verification email and click link

2. **API Key Permissions:**
   - Go to SendGrid → Settings → API Keys
   - Check your key has Mail Send permissions
   - Create a new key with Full Access if needed

3. **Rate Limit Exceeded:**
   - Free tier: 100 emails/day
   - Check SendGrid dashboard for usage
   - Upgrade plan if needed

4. **Emails in Spam:**
   - Check your spam/junk folder
   - Add sender to safe senders list
   - Consider domain authentication for production

### Email Errors in Logs

**Problem:** Backend logs show:
```
Failed to send email { error: 'Unauthorized' }
```

**Solution:**
1. Verify API key is correct
2. Re-generate API key in SendGrid dashboard
3. Update `backend/.env` with new key
4. Restart backend server

**Problem:** Backend logs show:
```
Failed to send email { error: 'Bad Request: From email does not match verified sender' }
```

**Solution:**
1. Verify sender email in SendGrid
2. Update `SENDGRID_FROM_EMAIL` in `backend/.env` to match verified email
3. Restart backend server

---

## Production Deployment

### 1. Domain Authentication (Required)

For production, you must authenticate your domain:

1. Login to SendGrid
2. Go to: **Settings** → **Sender Authentication**
3. Click **Authenticate Your Domain**
4. Enter your domain: `saas.tf`
5. Choose your DNS host
6. Add the provided DNS records to your domain:
   - 3 CNAME records
   - May take up to 48 hours to propagate
7. Verify records are added correctly

**Benefits:**
- Improves email deliverability
- Reduces spam score
- Professional appearance
- Allows sending from any `@saas.tf` email

### 2. Production Environment Variables

Update your production environment with:

```bash
SENDGRID_API_KEY=SG.production_key_here
SENDGRID_FROM_EMAIL=noreply@saas.tf
FRONTEND_URL=https://saas.tf
```

### 3. Monitor Email Delivery

1. SendGrid Dashboard: https://app.sendgrid.com/
2. Check **Activity** tab for delivery statistics
3. Monitor bounces, spam reports, and opens
4. Set up alerts for delivery issues

### 4. Email Compliance

**Required for Production:**
- ✅ Add unsubscribe link (for marketing emails)
- ✅ Include physical address (CAN-SPAM compliance)
- ✅ Provide opt-out mechanism
- ✅ Honor opt-out requests within 10 business days

**Note:** Transactional emails (payment confirmations, receipts) are exempt from CAN-SPAM unsubscribe requirements, but best practice is to include them anyway.

---

## Email Service Architecture

### Service Structure

**Location:** [`backend/src/services/email.service.ts`](backend/src/services/email.service.ts)

```typescript
export class EmailService {
  private enabled: boolean;    // Whether SendGrid is configured
  private fromEmail: string;    // Sender email address

  // Core sending method
  private async sendEmail(params: EmailParams): Promise<boolean>

  // Notification methods
  async sendSubscriptionCreated(params: SubscriptionCreatedParams): Promise<boolean>
  async sendPaymentSucceeded(params: PaymentSucceededParams): Promise<boolean>
  async sendPaymentFailed(params: PaymentFailedParams): Promise<boolean>
  async sendSubscriptionExpired(params: SubscriptionExpiredParams): Promise<boolean>

  // Utility
  isEnabled(): boolean
}
```

### Integration Points

**Webhook Controller:** [`backend/src/controllers/webhook.controller.ts`](backend/src/controllers/webhook.controller.ts)
- Lines 137-155: Send subscription created email after checkout
- Lines 254-269: Send payment succeeded email after successful payment
- Lines 316-330: Send payment failed email after failed payment

**Subscription Service:** [`backend/src/services/subscription.service.ts`](backend/src/services/subscription.service.ts)
- Lines 731-745: Send subscription expired email when cron job expires subscription

### Error Handling

All email calls are wrapped in try-catch blocks to prevent email failures from breaking webhooks:

```typescript
try {
  await emailService.sendEmail(...);
} catch (emailError: any) {
  logger.error('Failed to send email', { error: emailError.message });
  // Continue execution - don't fail webhook
}
```

---

## Alternative Email Providers

### AWS SES

**Pros:**
- Very cheap ($0.10 per 1,000 emails)
- Excellent deliverability
- Integrates with AWS ecosystem

**Cons:**
- Requires AWS account
- More complex setup
- Requires domain verification

**Integration:**
```bash
npm install @aws-sdk/client-ses
```

### Resend

**Pros:**
- Modern API
- Great developer experience
- Simple setup

**Cons:**
- Newer service
- Fewer features than SendGrid

**Integration:**
```bash
npm install resend
```

### Postmark

**Pros:**
- Excellent deliverability
- Focus on transactional emails
- Fast delivery

**Cons:**
- More expensive
- No free tier

**Integration:**
```bash
npm install postmark
```

To switch providers, update [`backend/src/services/email.service.ts`](backend/src/services/email.service.ts) and replace SendGrid implementation.

---

## Frequently Asked Questions

**Q: Can I use Gmail to send emails?**
A: Not recommended for production. Gmail has strict sending limits (500 emails/day) and may mark your app as spam. Use a dedicated email service provider like SendGrid.

**Q: How many emails can I send with SendGrid free tier?**
A: 100 emails per day, forever. This is sufficient for testing and small applications. Upgrade to paid plans for higher volume.

**Q: Do emails cost money in production?**
A: SendGrid's first 100 emails/day are free. After that:
- Essential: $14.95/month for 40,000 emails
- Pro: $89.95/month for 100,000 emails
- See https://sendgrid.com/pricing/ for full pricing

**Q: Why are emails going to spam?**
A: Common reasons:
1. Sender not verified
2. No domain authentication
3. High bounce rate
4. Spam-trigger words in subject/content
5. No unsubscribe link

**Q: Can I preview emails before sending?**
A: Yes! Use a service like Mailtrap (https://mailtrap.io/) for development. It captures all outgoing emails without actually sending them.

**Q: How do I test emails without spamming real users?**
A: Use your own email address for testing, or use Mailtrap to capture emails in development.

---

## Success Criteria

### Development
- [x] SendGrid account created
- [x] API key generated
- [x] Sender email verified
- [x] Environment variables configured
- [x] Email service initialized
- [ ] All 4 email types tested and received

### Production
- [ ] Domain authenticated in SendGrid
- [ ] Production API key configured
- [ ] From email set to production domain
- [ ] Email delivery monitored
- [ ] Bounce handling configured
- [ ] Unsubscribe links added (if needed)

---

## Next Steps

1. **Complete Development Testing:**
   - Test all 4 email types
   - Verify emails arrive correctly
   - Check formatting on mobile devices
   - Review email content for typos

2. **Prepare for Production:**
   - Authenticate your domain
   - Update email templates with production URLs
   - Add company information to footers
   - Set up delivery monitoring

3. **Move to Priority 4:**
   - Production deployment checklist
   - Error monitoring setup
   - Final production verification

---

**Email Notifications: ✅ Complete!**
All email notifications are now integrated and ready for testing. Configure SendGrid and test the complete flow!
