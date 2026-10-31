import process from 'node:process';
import { Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { loadEnvironment } from '../src/config/environment.js';
import { seedBase } from './seed/base.js';
import { seedCatalog } from './seed/catalog.js';
import { seedSubscriptions } from './seed/subscriptions.js';
import {
  SEED_CUSTOMERS,
  SEED_CUSTOMER_PASSWORD,
  SEED_STAFF,
  SEED_STAFF_PASSWORD,
  seedPeople,
} from './seed/people.js';

const logger = new Logger('Seed');

async function main(): Promise<void> {
  // Runs compiled from dist/seed/prisma/, five levels below the repo root.
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
    await seedSubscriptions(prisma, env.SEED_ADMIN_EMAIL);
  } finally {
    await prisma.$disconnect();
  }
  logger.log('Seed complete. Logins:');
  logger.log(
    `  Admin     ${env.SEED_ADMIN_EMAIL} / ${env.SEED_ADMIN_PASSWORD} (from .env)`,
  );
  for (const staff of SEED_STAFF) {
    logger.log(`  Staff     ${staff.email} / ${SEED_STAFF_PASSWORD}`);
  }
  for (const customer of SEED_CUSTOMERS) {
    logger.log(`  Customer  ${customer.email} / ${SEED_CUSTOMER_PASSWORD}`);
  }
}

main().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : 'Seed failed');
  process.exitCode = 1;
});
