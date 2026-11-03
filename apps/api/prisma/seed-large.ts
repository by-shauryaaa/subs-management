import process from 'node:process';
import { Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { loadEnvironment } from '../src/config/environment.js';
import { seedBase } from './seed/base.js';
import { seedCatalog } from './seed/catalog.js';
import { seedPeople } from './seed/people.js';
import { seedLarge } from './seed/seed-large.js';

const logger = new Logger('SeedLarge');

async function main(): Promise<void> {
  const env = loadEnvironment(new URL('../../../../../.env', import.meta.url));
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });
  try {
    await seedBase(prisma, {
      adminEmail: env.SEED_ADMIN_EMAIL,
      adminPassword: env.SEED_ADMIN_PASSWORD,
    });
    await seedPeople(prisma);
    await seedCatalog(prisma);
    await seedLarge(prisma);
    logger.log('Large scale seed complete: 50+ customers, 100+ subscriptions, 200+ invoices, payments, discounts & quotation templates.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : 'Large seed failed');
  process.exitCode = 1;
});
