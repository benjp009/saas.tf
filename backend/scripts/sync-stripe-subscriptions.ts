import { PrismaClient, SubscriptionStatus, SubscriptionPlan } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Match the SUBSCRIPTION_PLANS from subscription.service.ts
const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    subdomainQuota: 2,
    features: ['Up to 2 subdomains', 'Basic DNS management', 'Email support'],
    priceId: null,
  },
  PACKAGE_5: {
    name: '5 Subdomains Package',
    price: 4900,
    subdomainQuota: 7,
    features: [
      'Up to 7 subdomains (2 free + 5)',
      'Advanced DNS management',
      'Priority support',
      '99.9% uptime SLA',
    ],
    priceId: process.env.STRIPE_PRICE_ID_PACKAGE_5,
  },
  PACKAGE_50: {
    name: '50 Subdomains Package',
    price: 9900,
    subdomainQuota: 52,
    features: [
      'Up to 52 subdomains (2 free + 50)',
      'Advanced DNS management',
      'Dedicated support',
      '99.99% uptime SLA',
      'API access',
    ],
    priceId: process.env.STRIPE_PRICE_ID_PACKAGE_50,
  },
};

async function syncStripeSubscriptions() {
  const userEmail = 'patin.benjamin@me.com';

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  if (!user.stripeCustomerId) {
    console.log('No Stripe customer ID found for this user');
    return;
  }

  console.log(`\n=== Syncing subscriptions for ${user.email} ===\n`);

  // Fetch subscriptions from Stripe
  const stripeSubscriptions = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    limit: 100,
  });

  console.log(`Found ${stripeSubscriptions.data.length} subscriptions in Stripe\n`);

  // Get existing subscriptions from database
  const dbSubscriptions = await prisma.subscription.findMany({
    where: { userId: user.id },
  });

  const dbStripeIds = new Set(
    dbSubscriptions
      .filter(s => s.stripeSubscriptionId)
      .map(s => s.stripeSubscriptionId)
  );

  console.log(`Found ${dbSubscriptions.length} subscriptions in database\n`);

  // Find missing subscriptions
  const missingSubscriptions = stripeSubscriptions.data.filter(
    stripeSub => !dbStripeIds.has(stripeSub.id)
  );

  if (missingSubscriptions.length === 0) {
    console.log('✅ All Stripe subscriptions are already in the database');
    await prisma.$disconnect();
    return;
  }

  console.log(`⚠️  Found ${missingSubscriptions.length} subscriptions to sync:\n`);

  // Sync each missing subscription
  for (const stripeSub of missingSubscriptions) {
    const priceId = stripeSub.items.data[0]?.price.id;

    // Determine plan from price ID
    let plan: SubscriptionPlan = SubscriptionPlan.FREE;
    for (const [key, value] of Object.entries(SUBSCRIPTION_PLANS)) {
      if (value.priceId === priceId) {
        plan = key as SubscriptionPlan;
        break;
      }
    }

    const planConfig = SUBSCRIPTION_PLANS[plan];

    // Map Stripe status to our status
    let status: SubscriptionStatus = SubscriptionStatus.ACTIVE;
    switch (stripeSub.status) {
      case 'active':
        status = SubscriptionStatus.ACTIVE;
        break;
      case 'trialing':
        status = SubscriptionStatus.TRIALING;
        break;
      case 'past_due':
        status = SubscriptionStatus.PAST_DUE;
        break;
      case 'canceled':
      case 'unpaid':
        status = SubscriptionStatus.CANCELED;
        break;
    }

    console.log(`Syncing: ${stripeSub.id}`);
    console.log(`  Plan: ${plan}`);
    console.log(`  Status: ${status}`);
    console.log(`  Price ID: ${priceId}`);
    console.log(`  Quota: ${planConfig.subdomainQuota}`);

    try {
      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          plan,
          status,
          stripeSubscriptionId: stripeSub.id,
          stripePriceId: priceId,
          stripeCurrentPeriodStart: new Date(stripeSub.current_period_start * 1000),
          stripeCurrentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          stripeCancelAtPeriodEnd: stripeSub.cancel_at_period_end,
          stripeCancelAt: stripeSub.cancel_at ? new Date(stripeSub.cancel_at * 1000) : null,
          subdomainQuota: planConfig.subdomainQuota,
          subdomainsUsed: 0,
        },
      });

      console.log(`  ✅ Created subscription ${subscription.id}\n`);
    } catch (error) {
      console.log(`  ❌ Failed to create subscription: ${error}\n`);
    }
  }

  // Show summary
  console.log('\n=== Summary ===');
  const finalCount = await prisma.subscription.count({
    where: { userId: user.id },
  });
  console.log(`Total subscriptions in database: ${finalCount}`);

  await prisma.$disconnect();
}

syncStripeSubscriptions().catch(console.error);
