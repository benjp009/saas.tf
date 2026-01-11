import { PrismaClient } from '@prisma/client';
import { RESERVED_SUBDOMAINS } from '../src/constants/reserved-subdomains';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Seed reserved subdomains
  console.log(`📋 Seeding ${RESERVED_SUBDOMAINS.length} reserved subdomains...`);

  let created = 0;
  let updated = 0;

  for (const name of RESERVED_SUBDOMAINS) {
    const result = await prisma.reservedSubdomain.upsert({
      where: { name },
      update: {
        reason: 'System reserved subdomain',
      },
      create: {
        name,
        reason: 'System reserved subdomain',
      },
    });

    if (result.createdAt === result.updatedAt) {
      created++;
    } else {
      updated++;
    }
  }

  console.log(`✅ Seeded reserved subdomains:`);
  console.log(`   - Created: ${created}`);
  console.log(`   - Updated: ${updated}`);
  console.log(`   - Total: ${RESERVED_SUBDOMAINS.length}`);

  // Print some examples
  console.log(`\n📝 Examples of reserved subdomains:`);
  const examples = RESERVED_SUBDOMAINS.slice(0, 10);
  examples.forEach((name) => {
    console.log(`   - ${name}`);
  });

  console.log('\n🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
