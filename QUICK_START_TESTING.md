# Quick Start: Stripe Integration Testing

## ✅ Setup Complete

You're ready to start testing! The manual cron trigger endpoint has been added and Stripe CLI is installed.

---

## Step 1: Start Your Servers (3 Terminals)

### Terminal 1: Backend
```bash
cd backend
npm run dev
```
**Expected:** Server running on http://localhost:4000

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```
**Expected:** App running on http://localhost:3000

### Terminal 3: Stripe CLI Webhook Forwarding
```bash
# Login to Stripe (first time only)
stripe login

# Forward webhooks to your local backend
stripe listen --forward-to localhost:4000/api/v1/webhooks/stripe
```

**Expected output:**
```
> Ready! You are using Stripe API Version [...]
> Your webhook signing secret is whsec_xxxxxxxxxxxxxxx
```

**IMPORTANT:** Copy the webhook signing secret (starts with `whsec_`)

---

## Step 2: Update Webhook Secret

Open `backend/.env` and update:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxx  # Paste your secret here
```

**Restart your backend server** (Terminal 1: Ctrl+C, then `npm run dev`)

---

## Step 3: Run Test Case 1 - New User Checkout

### 3.1 Create Test User
1. Go to http://localhost:3000/auth/register
2. Register with:
   - Email: test1@example.com
   - Password: TestPass123!@#
   - First Name: John
   - Last Name: Doe

### 3.2 Check FREE Subscription Auto-Created
```bash
# In a new terminal, check the database
cd backend
npm run prisma:studio
```
- Open http://localhost:5555
- Go to **Subscription** table
- You should see 1 FREE subscription with quota=2

### 3.3 Navigate to Billing
1. Go to http://localhost:3000/billing
2. You should see:
   - "Free" subscription card
   - "5 Subdomains Package" ($10/year) - Buy Package button
   - "50 Subdomains Package" ($50/year) - Buy Package button

### 3.4 Complete Checkout
1. Click "Buy Package" on **5 Subdomains Package**
2. You'll be redirected to Stripe Checkout
3. Use test card: `4242 4242 4242 4242`
4. Expiry: Any future date (e.g., 12/34)
5. CVC: Any 3 digits (e.g., 123)
6. Click "Subscribe"

### 3.5 Verify Webhook Received
**Watch Terminal 3 (Stripe CLI)** - You should see:
```
[200] POST /api/v1/webhooks/stripe [evt_xxxxx]
checkout.session.completed
```

### 3.6 Verify Backend Logs
**Watch Terminal 1 (Backend)** - You should see:
```
Stripe webhook received { type: 'checkout.session.completed', id: 'evt_xxx' }
Checkout completed successfully { userId: 'xxx', subscriptionId: 'sub_xxx' }
```

### 3.7 Verify Database
In Prisma Studio:
- Refresh **Subscription** table
- You should now see **2 subscriptions**:
  1. FREE plan (quota=2)
  2. PACKAGE_5 (quota=7)

### 3.8 Verify Frontend
1. You'll be redirected to http://localhost:3000/billing?session=success
2. You should see green success banner: "Subscription Updated Successfully"
3. Refresh page - you should see both subscription cards
4. Total quota should show: **9 subdomains** (2 + 7)

---

## Test Case 2: Multiple Subscriptions (Stacking)

1. On billing page, click "Buy Package" on **50 Subdomains Package**
2. Complete checkout with test card: `4242 4242 4242 4242`
3. **Watch Terminal 3** for webhook
4. **Verify database**: Now 3 subscriptions (FREE, PACKAGE_5, PACKAGE_50)
5. **Verify frontend**: Total quota = **61 subdomains** (2 + 7 + 52)

---

## Test Case 3: Quota Enforcement

1. Go to http://localhost:3000/dashboard
2. Click "Create Subdomain" 9 times (up to your quota of 9)
3. Try to create a 10th subdomain
4. **Expected:** Error message "Quota exceeded" with upgrade suggestion

---

## Test Case 4: Customer Portal

1. On billing page, click "Manage Billing" button
2. You'll be redirected to Stripe Customer Portal
3. Test actions:
   - Update payment method (use another test card)
   - Download invoice
4. Return to app
5. **Watch Terminal 3** for `customer.subscription.updated` webhook

---

## Test Case 5: Subscription Cancellation

1. On billing page, find PACKAGE_5 subscription card
2. Click "Cancel Package" button
3. Confirm cancellation
4. **Watch Terminal 3** for webhook
5. **Verify:** Subscription shows "Cancels on [date]"
6. **Verify database:** `cancel_at_period_end: true`

---

## Test Case 6: Payment Failure

1. Create new test user: test2@example.com
2. Go to billing page
3. Click "Buy Package" on PACKAGE_5
4. Use **declined card**: `4000 0000 0000 0002`
5. **Expected:** Payment will fail
6. **Watch Terminal 3** for `invoice.payment_failed` webhook
7. **Verify database:** Payment record with `status='failed'`

---

## Test Case 7: Grace Period & Expiration

### 7.1 Setup Test Data
```sql
-- In Prisma Studio or database client:
-- 1. Find a subscription ID
SELECT id, "userId", status, "stripeCurrentPeriodEnd"
FROM "Subscription"
WHERE plan != 'FREE'
LIMIT 1;

-- 2. Set to PAST_DUE with period end 1 day ago (within grace period)
UPDATE "Subscription"
SET
  status = 'PAST_DUE',
  "stripeCurrentPeriodEnd" = NOW() - INTERVAL '1 day'
WHERE id = 'YOUR_SUBSCRIPTION_ID';
```

### 7.2 Trigger Cron (Within Grace Period)
```bash
# Get auth token
TOKEN="your_jwt_token_from_localStorage"

# Trigger cron check
curl -X POST http://localhost:4000/api/v1/cron/trigger-expired \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Subscription NOT expired (within 48hr grace period)

### 7.3 Test Outside Grace Period
```sql
-- Update to 3 days ago (outside grace period)
UPDATE "Subscription"
SET "stripeCurrentPeriodEnd" = NOW() - INTERVAL '3 days'
WHERE id = 'YOUR_SUBSCRIPTION_ID';
```

Trigger cron again (same curl command)

**Expected:**
- Subscription marked as `EXPIRED`
- If subdomains > remaining quota, all subdomains deactivated
- Check backend logs for details

---

## Quick Verification Checklist

- [ ] Backend running on :4000
- [ ] Frontend running on :3000
- [ ] Stripe CLI forwarding webhooks
- [ ] Webhook secret updated in backend/.env
- [ ] Test Case 1: Checkout successful ✅
- [ ] Test Case 1: Webhook received ✅
- [ ] Test Case 1: Quota updated to 9 ✅
- [ ] Test Case 2: Multiple subscriptions working ✅
- [ ] Test Case 3: Quota enforcement working ✅
- [ ] Test Case 4: Customer portal accessible ✅
- [ ] Test Case 5: Cancellation working ✅
- [ ] Test Case 6: Payment failure handled ✅
- [ ] Test Case 7: Grace period logic working ✅

---

## Useful Commands

### Get JWT Token (for curl commands)
```javascript
// In browser console (localhost:3000)
localStorage.getItem('token')
```

### Check Database
```bash
cd backend
npm run prisma:studio
# Open http://localhost:5555
```

### View All Subscriptions
```sql
SELECT
  u.email,
  s.plan,
  s.status,
  s."subdomainQuota",
  s."stripeCurrentPeriodEnd"
FROM "Subscription" s
JOIN "User" u ON u.id = s."userId"
ORDER BY u.email, s."createdAt";
```

### Check Stripe Dashboard
1. Go to https://dashboard.stripe.com (test mode)
2. Navigate to:
   - **Payments** - See all test payments
   - **Customers** - See test customers
   - **Subscriptions** - See active subscriptions
   - **Webhooks** - See webhook delivery logs

---

## Troubleshooting

### Webhook not received
- Check Stripe CLI is running (Terminal 3)
- Verify webhook secret in backend/.env
- Restart backend after updating secret

### "Payment service not configured" error
- Check backend/.env has STRIPE_SECRET_KEY
- Restart backend

### Subscription not created after checkout
- Check backend logs for errors
- Verify webhook was received (Terminal 3)
- Check Stripe Dashboard → Webhooks for delivery status

### Database connection error
- Ensure PostgreSQL is running: `brew services list`
- Check DATABASE_URL in backend/.env

---

## Next Steps After Testing

Once all test cases pass:
1. Document results in `TEST_RESULTS.md`
2. Move to Priority 2: Write comprehensive test suite
3. Implement Priority 3: Email notifications
4. Prepare Priority 4: Production readiness

---

**Ready to start testing? Begin with Step 1!** 🚀
