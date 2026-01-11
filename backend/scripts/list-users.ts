import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  console.log(`\n=== All Users (${users.length}) ===\n`);

  for (const user of users) {
    const subscriptionCount = await prisma.subscription.count({
      where: { userId: user.id },
    });

    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.firstName || ''} ${user.lastName || ''}`);
    console.log(`ID: ${user.id}`);
    console.log(`Subscriptions: ${subscriptionCount}`);
    console.log('');
  }

  await prisma.$disconnect();
}

listUsers().catch(console.error);
