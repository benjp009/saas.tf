import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

async function checkStripeSubscriptions() {
  const userEmail = 'patin.benjamin@me.com';

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log(`\n=== User: ${user.email} ===`);
  console.log(`Stripe Customer ID: ${user.stripeCustomerId || 'N/A'}\n`);

  if (!user.stripeCustomerId) {
    console.log('No Stripe customer ID found for this user');
    return;
  }

  // Fetch subscriptions from Stripe
  console.log('=== Fetching from Stripe ===\n');
  const stripeSubscriptions = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    limit: 100,
  });

  console.log(`Total subscriptions in Stripe: ${stripeSubscriptions.data.length}\n`);

  stripeSubscriptions.data.forEach((sub, index) => {
    console.log(`${index + 1}. Stripe Subscription: ${sub.id}`);
    console.log(`   Status: ${sub.status}`);
    console.log(`   Created: ${new Date(sub.created * 1000).toISOString()}`);
    console.log(`   Current Period End: ${new Date(sub.current_period_end * 1000).toISOString()}`);
    console.log(`   Cancel At Period End: ${sub.cancel_at_period_end}`);
    console.log(`   Items: ${sub.items.data.map(item => item.price.id).join(', ')}`);
    console.log('');
  });

  // Fetch subscriptions from our database
  console.log('=== Fetching from Database ===\n');
  const dbSubscriptions = await prisma.subscription.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Total subscriptions in database: ${dbSubscriptions.length}\n`);

  dbSubscriptions.forEach((sub, index) => {
    console.log(`${index + 1}. DB Subscription: ${sub.id}`);
    console.log(`   Stripe Sub ID: ${sub.stripeSubscriptionId || 'N/A'}`);
    console.log(`   Status: ${sub.status}`);
    console.log(`   Plan: ${sub.plan}`);
    console.log('');
  });

  // Compare
  console.log('=== Comparison ===\n');
  const dbStripeIds = new Set(
    dbSubscriptions
      .filter(s => s.stripeSubscriptionId)
      .map(s => s.stripeSubscriptionId)
  );

  const missingInDb = stripeSubscriptions.data.filter(
    stripeSub => !dbStripeIds.has(stripeSub.id)
  );

  if (missingInDb.length > 0) {
    console.log(`⚠️  Found ${missingInDb.length} subscription(s) in Stripe that are NOT in our database:\n`);
    missingInDb.forEach(sub => {
      console.log(`   - ${sub.id} (${sub.status}) - Created: ${new Date(sub.created * 1000).toISOString()}`);
    });
  } else {
    console.log('✅ All Stripe subscriptions are in our database');
  }

  await prisma.$disconnect();
}

checkStripeSubscriptions().catch(console.error);
