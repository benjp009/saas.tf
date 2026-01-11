import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSubscriptions() {
  const userEmail = 'patin.benjamin@me.com';

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log(`\n=== User: ${user.email} (ID: ${user.id}) ===\n`);

  // Get ALL subscriptions regardless of status
  const subscriptions = await prisma.subscription.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Total subscriptions: ${subscriptions.length}\n`);

  subscriptions.forEach((sub, index) => {
    console.log(`${index + 1}. Subscription ID: ${sub.id}`);
    console.log(`   Plan: ${sub.plan}`);
    console.log(`   Status: ${sub.status}`);
    console.log(`   Subdomain Quota: ${sub.subdomainQuota}`);
    console.log(`   Stripe Subscription ID: ${sub.stripeSubscriptionId}`);
    console.log(`   Current Period End: ${sub.stripeCurrentPeriodEnd}`);
    console.log(`   Created: ${sub.createdAt}`);
    console.log(`   Canceled At: ${sub.canceledAt || 'N/A'}`);
    console.log('');
  });

  // Count by status
  const statusCounts = subscriptions.reduce((acc, sub) => {
    acc[sub.status] = (acc[sub.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('=== Status Breakdown ===');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`${status}: ${count}`);
  });

  await prisma.$disconnect();
}

checkSubscriptions().catch(console.error);
