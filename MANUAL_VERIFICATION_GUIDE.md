# Manual Verification Guide - Stripe Integration
**Priority 1: End-to-End Verification**
**Date:** 2026-01-09
**Status:** 🚀 Ready to Execute

---

## Overview

This guide walks you through manual testing of the complete Stripe payment integration with real Stripe test mode. You'll verify:
- ✅ Checkout flow with real Stripe test cards
- ✅ Webhook delivery and processing
- ✅ Multi-subscription stacking
- ✅ Quota enforcement
- ✅ Customer portal functionality
- ✅ Grace period handling

**Total Time Required:** ~3-4 hours

---

## Prerequisites

### 1. Stripe CLI Setup ✅
- **Status:** Already installed (version 1.34.0)
- **Location:** `/usr/local/bin/stripe`

### 2. Login to Stripe CLI

```bash
stripe login
```

This will open your browser to authenticate with your Stripe account. Make sure you're using **test mode**.

### 3. Verify Current Configuration

Check your Stripe configuration:
```bash
# View current Stripe keys
cat backend/.env | grep STRIPE

# Expected output:
# STRIPE_SECRET_KEY=sk_test_xxxxx
# STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
# STRIPE_WEBHOOK_SECRET=whsec_xxxxx (will update this)
# STRIPE_PRICE_ID_PACKAGE_5=price_1SnFkEDk11qA540F59h7kG3r
# STRIPE_PRICE_ID_PACKAGE_50=price_1SnFlFDk11qA540Fwh9RSl3F
```

---

## Step 1: Start Webhook Forwarding

### 1.1 Open Terminal Window for Stripe CLI

In a **new terminal window**, run:

```bash
cd ~/Documents/French\ SaaS/saas.tf
stripe listen --forward-to http://localhost:4000/api/v1/webhooks/stripe
```

**Expected Output:**
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxx (^C to quit)
```

### 1.2 Update Webhook Secret

Copy the `whsec_xxxxx` secret from the Stripe CLI output.

Update `backend/.env`:
```bash
# Replace the STRIPE_WEBHOOK_SECRET with the new value
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

**IMPORTANT:** Leave this terminal window running throughout all tests!

---

## Step 2: Start Backend and Frontend

### 2.1 Start Backend Server

Open a **new terminal window**:

```bash
cd ~/Documents/French\ SaaS/saas.tf/backend
npm run dev
```

**Expected Output:**
```
Server running on port 4000
Database connected
Cron jobs initialized
```

### 2.2 Start Frontend Server

Open a **new terminal window**:

```bash
cd ~/Documents/French\ SaaS/saas.tf/frontend
npm run dev
```

**Expected Output:**
```
Ready - started server on http://localhost:3000
```

---

## Test Case 1: New User Checkout Flow

**Goal:** Verify complete checkout process from registration to active subscription

### 1.1 Create Test User

1. Navigate to: http://localhost:3000/auth/register
2. Create a new test user:
   - Email: `test-checkout-1@example.com`
   - Password: `Test123!@#`
   - First Name: `Test`
   - Last Name: `User1`
3. Click "Register"

**Expected Result:** Redirected to dashboard

### 1.2 Verify FREE Subscription Auto-Created

Open your database tool or use:
```bash
cd ~/Documents/French\ SaaS/saas.tf/backend
npx prisma studio
```

Navigate to `Subscription` table and verify:
- ✅ One subscription exists for the new user
- ✅ `plan = 'FREE'`
- ✅ `status = 'ACTIVE'`
- ✅ `subdomainQuota = 2`

### 1.3 Purchase PACKAGE_5

1. Navigate to: http://localhost:3000/billing
2. Verify you see:
   - FREE subscription (2 subdomains)
   - Available plans to purchase
3. Click "Buy Package" on **Package 5 - $10/year** plan
4. You'll be redirected to Stripe Checkout

### 1.4 Complete Stripe Checkout

On the Stripe Checkout page:

1. Fill in test card details:
   - **Card Number:** `4242 4242 4242 4242`
   - **Expiration:** Any future date (e.g., `12/34`)
   - **CVC:** Any 3 digits (e.g., `123`)
   - **Name:** `Test User`
   - **Billing Address:** Any valid address

2. Click "Subscribe"

**Expected:** Redirected to success page

### 1.5 Watch Webhook Events

In your Stripe CLI terminal, you should see:

```
2026-01-09 10:30:45   --> checkout.session.completed [evt_xxxxx]
2026-01-09 10:30:46   <--  [200] POST http://localhost:4000/api/v1/webhooks/stripe [evt_xxxxx]
```

**Expected Status:** `[200]` (success)

### 1.6 Check Backend Logs

In your backend terminal, look for logs:
```
Webhook received: checkout.session.completed
Creating subscription for user: [userId]
Subscription created successfully
```

### 1.7 Verify Database Changes

Check Prisma Studio:

**Subscriptions Table:**
- ✅ **Two** subscriptions now exist:
  1. FREE (2 subdomains)
  2. PACKAGE_5 (7 subdomains)
- ✅ Total quota = 2 + 7 = **9 subdomains**

**Payments Table:**
- ✅ One payment record created
- ✅ `status = 'SUCCEEDED'`
- ✅ `amount = 1000` (cents)
- ✅ Linked to PACKAGE_5 subscription

### 1.8 Verify Frontend Display

1. Refresh billing page: http://localhost:3000/billing
2. Verify you see:
   - **FREE Subscription** (2 subdomains)
   - **Package 5** (7 subdomains) - Active
   - Total: **9 subdomains available**

### ✅ Test Case 1 Complete

**Results:**
- [ ] User registration successful
- [ ] FREE subscription auto-created
- [ ] Checkout completed with test card
- [ ] Webhook received and processed (200 status)
- [ ] PACKAGE_5 subscription created in database
- [ ] Payment record created
- [ ] Total quota = 9 subdomains
- [ ] Frontend displays both subscriptions

---

## Test Case 2: Multiple Subscriptions (Stacking)

**Goal:** Verify users can stack multiple subscriptions

### 2.1 Purchase PACKAGE_50

Using the same user from Test Case 1:

1. On billing page, click "Buy Package" on **Package 50 - $50/year**
2. Complete checkout with test card: `4242 4242 4242 4242`
3. Watch Stripe CLI for webhook

### 2.2 Verify Webhook Received

**Expected in Stripe CLI:**
```
--> checkout.session.completed [evt_xxxxx]
<-- [200] POST http://localhost:4000/api/v1/webhooks/stripe
```

### 2.3 Verify Database

**Subscriptions Table:**
- ✅ **Three** subscriptions now exist:
  1. FREE (2 subdomains)
  2. PACKAGE_5 (7 subdomains)
  3. PACKAGE_50 (52 subdomains)
- ✅ Total quota = 2 + 7 + 52 = **61 subdomains**

### 2.4 Verify Frontend

Refresh billing page:
- ✅ Shows all 3 subscriptions
- ✅ Total: **61 subdomains available**

### ✅ Test Case 2 Complete

**Results:**
- [ ] Successfully purchased second paid subscription
- [ ] Webhook processed correctly
- [ ] All 3 subscriptions visible in database
- [ ] Total quota = 61 subdomains
- [ ] Frontend displays all subscriptions correctly

---

## Test Case 3: Quota Enforcement

**Goal:** Verify quota limits are enforced

### 3.1 Check Current Subdomain Count

Using the same user (currently has 61 quota):

1. Navigate to: http://localhost:3000/dashboard
2. Note current subdomain count

### 3.2 Create Subdomains Up to Limit

Create subdomains until you reach the quota:

1. Click "Add Subdomain"
2. Enter subdomain name (e.g., `test-1`, `test-2`, etc.)
3. Enter IP address: `1.2.3.4`
4. Repeat until you have 61 subdomains

**Expected:** Each subdomain creation succeeds

### 3.3 Attempt to Exceed Quota

Try to create one more subdomain:

1. Click "Add Subdomain"
2. Enter name: `test-62`
3. Enter IP: `1.2.3.4`
4. Click "Create"

**Expected Result:**
- ❌ Error message displayed
- Error: `"You've reached your limit of 61 subdomains. Upgrade to create more!"`
- Response includes upgrade suggestions with available plans

### 3.4 Verify API Response

Check the Network tab in browser DevTools:

**Expected Response:**
```json
{
  "error": "You've reached your limit of 61 subdomains. Upgrade to create more!",
  "code": "QUOTA_EXCEEDED",
  "upgradeInfo": {
    "currentUsed": 61,
    "currentQuota": 61,
    "availablePlans": []
  }
}
```

### ✅ Test Case 3 Complete

**Results:**
- [ ] Successfully created subdomains up to quota limit
- [ ] Subdomain creation blocked at quota limit
- [ ] Error message displays correctly
- [ ] API returns QUOTA_EXCEEDED error with details

---

## Test Case 4: Customer Portal

**Goal:** Verify Stripe Customer Portal integration

### 4.1 Access Customer Portal

On billing page:

1. Click **"Manage Billing"** button
2. You'll be redirected to Stripe Customer Portal

**Expected:** Successfully redirected to Stripe-hosted portal

### 4.2 Update Payment Method

In Customer Portal:

1. Click "Update payment method"
2. Enter a different test card: `5555 5555 5555 4444` (Mastercard)
3. Save changes

**Expected:** Payment method updated successfully

### 4.3 View Invoice History

1. Click "Invoices" tab
2. Verify you see invoices for both subscriptions:
   - Package 5: $10.00
   - Package 50: $50.00

### 4.4 Download Invoice

1. Click "Download" on one invoice
2. Verify PDF downloads successfully

### 4.5 Return to App

1. Click "Return to [your app name]"
2. Verify you're redirected back to: http://localhost:3000/billing

### 4.6 Watch for Webhook (Optional)

If you updated payment method, check Stripe CLI for:
```
--> customer.subscription.updated [evt_xxxxx]
```

### ✅ Test Case 4 Complete

**Results:**
- [ ] Customer Portal accessed successfully
- [ ] Payment method updated
- [ ] Invoice history visible
- [ ] Invoice downloaded
- [ ] Successfully returned to app

---

## Test Case 5: Subscription Cancellation

**Goal:** Verify subscription cancellation flow

### 5.1 Cancel PACKAGE_5 Subscription

On billing page:

1. Find the **Package 5** subscription
2. Click "Cancel Package" or "Cancel Subscription"
3. Confirm cancellation

**Expected:** Confirmation message displayed

### 5.2 Watch Webhook

In Stripe CLI:
```
--> customer.subscription.updated [evt_xxxxx]
<-- [200] POST http://localhost:4000/api/v1/webhooks/stripe
```

### 5.3 Verify Database

Check Prisma Studio:

**Subscription (PACKAGE_5):**
- ✅ `status = 'ACTIVE'` (still active until period end)
- ✅ `cancelAtPeriodEnd = true`
- ✅ `stripeCancelAt` is set to future date

### 5.4 Verify Frontend Display

Refresh billing page:

**Expected:**
- ✅ Package 5 shows "Cancels on [date]"
- ✅ Still marked as active
- ✅ Total quota still includes Package 5 (until period end)

### 5.5 Verify Quota Still Available

1. Try creating a subdomain
2. Should still succeed (quota not reduced yet)

### ✅ Test Case 5 Complete

**Results:**
- [ ] Subscription cancelled successfully
- [ ] Webhook processed
- [ ] Database shows `cancelAtPeriodEnd = true`
- [ ] Frontend displays cancellation notice
- [ ] Quota remains available until period end

---

## Test Case 6: Payment Failure Simulation

**Goal:** Verify payment failure handling

### 6.1 Create New Test User

1. Register new user: `test-payment-fail@example.com`
2. Navigate to billing page

### 6.2 Use Declined Test Card

1. Click "Buy Package" on Package 5
2. At Stripe Checkout, use **declined card:**
   - **Card Number:** `4000 0000 0000 0002` (Generic decline)
   - Or: `4000 0000 0000 9995` (Insufficient funds)
3. Attempt to complete checkout

**Expected:** Checkout fails with error message

### 6.3 Alternative: Simulate Failed Payment

Since checkout might not complete, you can simulate a failed payment via Stripe Dashboard:

1. Go to: https://dashboard.stripe.com/test/payments
2. Create a test payment and mark it as failed
3. Or trigger `invoice.payment_failed` webhook via Stripe Dashboard → Webhooks → Send test webhook

### 6.4 Watch Webhook (If Triggered)

In Stripe CLI:
```
--> invoice.payment_failed [evt_xxxxx]
<-- [200] POST http://localhost:4000/api/v1/webhooks/stripe
```

### 6.5 Check Backend Logs

Look for:
```
Payment failed for user: [email]
Invoice ID: [invoiceId]
```

### 6.6 Verify Database (If Applicable)

**Payments Table:**
- ✅ Payment record created with `status = 'FAILED'`

### ✅ Test Case 6 Complete

**Results:**
- [ ] Payment failure handled gracefully
- [ ] Webhook received (if triggered)
- [ ] Failed payment logged in backend
- [ ] Database records payment failure

---

## Test Case 7: Grace Period & Expiration

**Goal:** Verify subscription expiration and grace period handling

### 7.1 Setup - Manually Expire a Subscription

This requires database manipulation since we can't wait 48 hours:

```bash
cd ~/Documents/French\ SaaS/saas.tf/backend
npx prisma studio
```

**Option A: Within Grace Period (Should NOT Expire)**

1. Find a PACKAGE_5 subscription
2. Update:
   - `status` → `PAST_DUE`
   - `stripeCurrentPeriodEnd` → 1 day ago (e.g., 2026-01-08)
3. Save changes

**Option B: Beyond Grace Period (Should Expire)**

1. Find a different subscription
2. Update:
   - `status` → `PAST_DUE`
   - `stripeCurrentPeriodEnd` → 3 days ago (e.g., 2026-01-06)
3. Save changes

### 7.2 Trigger Cron Job Manually

Make API call to trigger expired subscriptions check:

```bash
# Get user authentication token first
# Login via frontend or extract token from browser DevTools

# Then call the cron trigger endpoint
curl -X POST http://localhost:4000/api/v1/cron/trigger-expired \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Expired subscriptions check completed successfully"
}
```

### 7.3 Check Backend Logs

Look for:
```
Running expired subscriptions check...
Found X expired subscriptions
Processing subscription: [id]
Subscription expired: [id]
Expired subscriptions check completed
```

### 7.4 Verify Database - Within Grace Period

For subscription with `stripeCurrentPeriodEnd` 1 day ago:

- ✅ `status` remains `PAST_DUE` (NOT changed to EXPIRED)
- ✅ Subdomains remain active

### 7.5 Verify Database - Beyond Grace Period

For subscription with `stripeCurrentPeriodEnd` 3 days ago:

- ✅ `status` changed to `EXPIRED`
- ✅ If user had more subdomains than remaining quota:
  - Excess subdomains marked `isActive = false`

### 7.6 Verify Frontend

Refresh billing page:

**Expected:**
- Expired subscription shows "Expired" status
- Quota count updated to reflect only active subscriptions
- If subdomains were deactivated, warning message displayed

### ✅ Test Case 7 Complete

**Results:**
- [ ] Cron job triggered successfully
- [ ] Subscriptions within grace period NOT expired
- [ ] Subscriptions beyond grace period marked EXPIRED
- [ ] Subdomains deactivated if over remaining quota
- [ ] Frontend displays updated status

---

## Test Results Summary

### Overall Status: [ ] Complete

**Test Cases Completed:**
- [ ] Test Case 1: New User Checkout Flow
- [ ] Test Case 2: Multiple Subscriptions (Stacking)
- [ ] Test Case 3: Quota Enforcement
- [ ] Test Case 4: Customer Portal
- [ ] Test Case 5: Subscription Cancellation
- [ ] Test Case 6: Payment Failure Simulation
- [ ] Test Case 7: Grace Period & Expiration

**Issues Discovered:** (Document any bugs or unexpected behavior)

```
Issue #1:
- Description:
- Severity: [Low/Medium/High/Critical]
- Steps to Reproduce:
- Expected Behavior:
- Actual Behavior:
- Fix Required: [Yes/No]

Issue #2:
...
```

**Success Metrics:**
- [ ] All 7 test cases passed
- [ ] All webhooks delivered with 200 status
- [ ] Database state correct after each operation
- [ ] Frontend displays accurate information
- [ ] No console errors
- [ ] No backend errors

---

## Troubleshooting

### Webhook Not Received (Status: No Response)

**Problem:** Stripe CLI shows webhook sent but no response

**Solutions:**
1. Verify backend is running on port 4000
2. Check backend logs for errors
3. Verify webhook endpoint: `http://localhost:4000/api/v1/webhooks/stripe`
4. Check STRIPE_WEBHOOK_SECRET is updated in backend/.env
5. Restart backend server after updating env vars

### Webhook Returns 400 Error

**Problem:** `<-- [400] POST http://localhost:4000/api/v1/webhooks/stripe`

**Likely Cause:** Webhook signature verification failed

**Solution:**
1. Copy the `whsec_xxxxx` from Stripe CLI output
2. Update `backend/.env` with new webhook secret
3. Restart backend server
4. Try the operation again

### Database Connection Error

**Problem:** Backend shows "Database connection failed"

**Solution:**
```bash
cd ~/Documents/French\ SaaS/saas.tf/backend
npx prisma generate
npx prisma db push
```

### Checkout Session Expired

**Problem:** Stripe Checkout shows "This checkout session has expired"

**Cause:** Checkout sessions expire after 24 hours

**Solution:**
- Create a new checkout session by clicking "Buy Package" again

### Cannot Create Subdomain - Quota Exceeded

**Problem:** Blocked from creating subdomains even though quota should be available

**Debug:**
1. Check Prisma Studio → Subscriptions table
2. Verify all subscriptions have correct `subdomainQuota` values
3. Check `status` - only ACTIVE, TRIALING, PAST_DUE count toward quota
4. Check Subdomain table for `isActive = true` count

---

## Next Steps After Verification

Once all manual tests pass:

1. **Document Results:**
   - Update test results section above
   - Take screenshots of successful flows
   - Note any bugs or issues discovered

2. **Fix Issues (If Any):**
   - Address bugs found during testing
   - Re-run affected test cases
   - Update code and re-deploy

3. **Move to Priority 3:**
   - Email Notifications (SendGrid integration)
   - See plan for details

4. **Move to Priority 4:**
   - Production Readiness
   - Deployment checklist
   - Error monitoring setup

---

## Quick Reference - Stripe Test Cards

| Card Number | Type | Result |
|-------------|------|--------|
| 4242 4242 4242 4242 | Visa | Success |
| 4000 0025 0000 3155 | Visa | Requires authentication (3D Secure) |
| 4000 0000 0000 9995 | Visa | Declined - Insufficient funds |
| 4000 0000 0000 0002 | Visa | Declined - Generic decline |
| 4000 0000 0000 0341 | Visa | Attaching fails |
| 5555 5555 5555 4444 | Mastercard | Success |

**More test cards:** https://stripe.com/docs/testing

---

## Verification Complete! 🎉

Once all tests pass, update [TEST_RESULTS.md](TEST_RESULTS.md) with:
- Manual test execution results
- Screenshots (optional but helpful)
- Any issues discovered and their resolutions
- Final sign-off that Priority 1 is complete

**Next Priority:** Email Notifications (Priority 3) or Production Readiness (Priority 4)
