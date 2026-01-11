import { PrismaClient, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCanceledSubscription() {
  const stripeSubId = 'sub_1SnR8TDk11qA540FCXVnDi3K';

  console.log(`\n=== Fixing subscription ${stripeSubId} ===\n`);

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubId },
  });

  if (!subscription) {
    console.log('Subscription not found');
    return;
  }

  console.log('Current status:', subscription.status);
  console.log('Stripe cancel at period end: true');
  console.log('Period ends:', subscription.stripeCurrentPeriodEnd);

  // This subscription should be ACTIVE until the period ends
  // Cancel at period end means it will cancel automatically, but it's still active now
  if (subscription.status === 'CANCELED') {
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        stripeCancelAtPeriodEnd: true,
      },
    });

    console.log('\n✅ Updated status to ACTIVE (cancel at period end)');
    console.log('New status:', updated.status);
  }

  await prisma.$disconnect();
}

fixCanceledSubscription().catch(console.error);
