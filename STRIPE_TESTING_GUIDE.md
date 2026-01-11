# Stripe Payment Integration - Testing Guide

## Phase 2 Implementation Status

✅ **Completed:**
- Stripe API integration (backend)
- Checkout session creation
- Customer portal access
- Webhook handlers for all payment events
- Frontend billing page with plan selection
- Auth persistence fixes
- Stripe redirect flow

## Testing the Payment Flow

### 1. Prerequisites

Make sure both servers are running:
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 2. Test Checkout Flow

1. **Login**: Go to http://localhost:3000/auth/login
   - Email: Your test user email
   - Password: Your test password

2. **Navigate to Billing**: Click or go to http://localhost:3000/billing
   - Should see your current FREE plan
   - Should see "Available Packages" section with PACKAGE_5 and PACKAGE_50

3. **Click "Buy Package"**: Click on either PACKAGE_5 ($10/year) or PACKAGE_50 ($50/year)
   - Button should change to "Processing..."
   - Should redirect to Stripe Checkout page

4. **Complete Test Payment**:
   Use Stripe test card numbers:
   - **Success**: 4242 4242 4242 4242
   - **Declined**: 4000 0000 0000 0002
   - **3D Secure**: 4000 0025 0000 3155
   - Any future expiry date (e.g., 12/34)
   - Any 3-digit CVC
   - Any postal code

5. **After Payment**:
   - Should redirect back to http://localhost:3000/billing?session=success
   - Should see "Subscription Updated Successfully" green banner
   - **NOTE**: Subscription will only update after webhook is received

### 3. Test Webhooks (Local Development)

For local testing, you need Stripe CLI to forward webhooks to your local server.

#### Install Stripe CLI

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Other OS:** Download from https://stripe.com/docs/stripe-cli

#### Setup Webhook Forwarding

```bash
# Login to Stripe
stripe login

# Forward webhooks to local backend
stripe listen --forward-to localhost:4000/api/v1/webhooks/stripe
```

The CLI will output a webhook signing secret like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

#### Configure Webhook Secret

Add the webhook secret to your backend `.env` file:
```bash
# In backend/.env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

Restart your backend server after adding the secret.

#### Test Webhook Events

With Stripe CLI running, complete a test checkout:
1. The CLI will show all webhook events being forwarded
2. Your backend logs will show webhook processing
3. After `checkout.session.completed` event, your subscription should update

You should see logs like:
```
Stripe webhook received { type: 'checkout.session.completed', id: 'evt_xxx' }
Checkout completed successfully { userId: 'xxx', subscriptionId: 'sub_xxx' }
```

### 4. Test Customer Portal

After upgrading to a paid plan:

1. Go to http://localhost:3000/billing
2. Click "Manage Billing" button
3. Should redirect to Stripe Customer Portal
4. Can test:
   - Update payment method
   - View invoices
   - Cancel subscription

### 5. Test Subscription Cancellation

Two ways to cancel:

**Option 1: From Billing Page**
1. Click "Cancel Package" button on billing page
2. Confirm cancellation
3. Subscription will be set to cancel at period end

**Option 2: From Customer Portal**
1. Click "Manage Billing"
2. Cancel subscription in Stripe portal
3. Webhook will update local database

## Stripe Test Mode Configuration

Your current Stripe configuration:

```
STRIPE_SECRET_KEY=sk_test_51SnFi1Dk11qA540F...
STRIPE_PUBLISHABLE_KEY=pk_test_51SnFi1Dk11qA540F...
STRIPE_PRICE_ID_PACKAGE_5=price_1SnFkEDk11qA540F59h7kG3r
STRIPE_PRICE_ID_PACKAGE_50=price_1SnFlFDk11qA540Fwh9RSl3F
```

All payments are in **TEST MODE** - no real charges will occur.

## Webhook Events Handled

The backend handles these Stripe webhook events:

1. ✅ `checkout.session.completed` - Creates new subscription after payment
2. ✅ `customer.subscription.updated` - Updates subscription status
3. ✅ `customer.subscription.deleted` - Marks subscription as canceled
4. ✅ `invoice.payment_succeeded` - Records successful payment
5. ✅ `invoice.payment_failed` - Records failed payment and logs warning

## Common Issues & Solutions

### Issue: "Processing..." button stuck, no redirect

**Cause**: Frontend was checking for wrong response property
**Solution**: ✅ Fixed - now checks for `data.sessionUrl`

### Issue: Auth not persisting after login

**Cause**: 401 interceptor was too aggressive
**Solution**: ✅ Fixed - interceptor only clears auth, pages handle redirects

### Issue: Webhook signature verification failed

**Cause**: Missing or incorrect webhook secret
**Solution**: Make sure `STRIPE_WEBHOOK_SECRET` is set in backend `.env` from Stripe CLI output

### Issue: Subscription doesn't update after payment

**Cause**: Webhooks not being received
**Solution**:
1. Make sure Stripe CLI is running and forwarding
2. Check backend logs for webhook events
3. Verify webhook secret is correct

## Next Steps

### For Production Deployment

1. **Get Production Stripe Keys**:
   - Go to https://dashboard.stripe.com
   - Switch from Test mode to Live mode
   - Copy production API keys
   - Create production price IDs for your products

2. **Configure Production Webhooks**:
   - In Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/api/v1/webhooks/stripe`
   - Select events to listen to (same as handled above)
   - Copy webhook signing secret

3. **Update Production Environment**:
   ```bash
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_... (from production webhook)
   STRIPE_PRICE_ID_PACKAGE_5=price_... (production)
   STRIPE_PRICE_ID_PACKAGE_50=price_... (production)
   ```

4. **Test in Production**:
   - Use real credit card in test mode first
   - Monitor Stripe Dashboard for events
   - Check webhook delivery logs

## Support

If you encounter issues:
1. Check backend logs for error messages
2. Check frontend browser console for errors
3. Check Stripe CLI output for webhook events
4. Check Stripe Dashboard → Events for webhook delivery status
