import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '@prisma/client';
import pg from 'pg';
import { loadEnvironment } from '../src/config/environment.js';

const sourceURL = loadEnvironment().DATABASE_URL;
const generatedSchema = `brightloop_test_${randomUUID().replaceAll('-', '')}`;
const migrationURL = new URL(sourceURL);
migrationURL.searchParams.set('schema', generatedSchema);
const client = new PrismaClient({
  adapter: new PrismaPg(
    { connectionString: sourceURL },
    { schema: generatedSchema },
  ),
});
const admin = new pg.Client({
  connectionString: sourceURL,
  connectionTimeoutMillis: 10_000,
});
let adminConnected = false;

function deployMigrations(): string {
  return execFileSync(
    process.execPath,
    [
      fileURLToPath(
        new URL('../node_modules/prisma/build/index.js', import.meta.url),
      ),
      'migrate',
      'deploy',
    ],
    {
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      env: { ...process.env, DATABASE_URL: migrationURL.toString() },
      timeout: 45_000,
      encoding: 'utf8',
      stdio: 'pipe',
    },
  );
}

async function fixture() {
  const customer = await client.customer.create({
    data: {
      user: {
        create: {
          email: `schema-${randomUUID()}@example.test`,
          name: 'Schema integration customer',
          role: 'CUSTOMER',
        },
      },
    },
  });
  const plan = await client.plan.create({
    data: {
      name: 'Monthly test plan',
      price: '100.00',
      billingPeriod: 'MONTHLY',
    },
  });
  const paymentTerm = await client.paymentTerm.create({
    data: { name: `Net 15 ${randomUUID()}`, dueDays: 15 },
  });
  const subscription = await client.subscription.create({
    data: {
      number: `SUB/TEST/${randomUUID()}`,
      customerId: customer.id,
      planId: plan.id,
      paymentTermId: paymentTerm.id,
      status: 'ACTIVE',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
    },
  });
  return { customerId: customer.id, subscriptionId: subscription.id };
}

function invoiceData(fixtureIds: {
  customerId: string;
  subscriptionId: string | null;
}): Prisma.InvoiceUncheckedCreateInput {
  return {
    ...fixtureIds,
    number: `INV/TEST/${randomUUID()}`,
    invoiceDate: new Date('2026-01-01T00:00:00.000Z'),
    dueDate: new Date('2026-01-16T00:00:00.000Z'),
    periodStart: new Date('2026-01-01T00:00:00.000Z'),
    periodEnd: new Date('2026-02-01T00:00:00.000Z'),
    customerSnapshot: {
      name: 'Schema integration customer',
      email: 'snapshot@example.test',
      companyName: null,
      billingAddress: null,
      taxId: null,
    },
    currency: 'INR',
    subtotal: '100.00',
    discountTotal: '0.00',
    taxTotal: '0.00',
    total: '100.00',
    amountPaid: '0.00',
  };
}

async function cleanupSchema(): Promise<void> {
  if (!/^brightloop_test_[0-9a-f]{32}$/u.test(generatedSchema)) {
    throw new Error('Refusing to drop an unowned schema');
  }
  if (adminConnected) {
    const { rows } = await admin.query<{ statement: string }>(
      `SELECT format('DROP SCHEMA %I CASCADE', $1::text) AS statement
       FROM pg_catalog.pg_namespace WHERE nspname = $1`,
      [generatedSchema],
    );
    if (rows[0]) await admin.query(rows[0].statement);
  }
}

describe('canonical database schema', () => {
  beforeAll(async () => {
    await admin.connect();
    adminConnected = true;
    deployMigrations();
    await client.$connect();
  });

  afterAll(async () => {
    try {
      await client.$disconnect();
    } finally {
      try {
        await cleanupSchema();
      } finally {
        await admin.end();
      }
    }
  });

  it('replays migrate deploy without pending migrations', () => {
    expect(deployMigrations()).toContain('No pending migrations to apply');
  });

  it('creates every canonical Prisma model table in the isolated schema', async () => {
    const { rows } = await admin.query<{ relname: string }>(
      `SELECT c.relname FROM pg_catalog.pg_class c
       JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = $1 AND c.relkind IN ('r', 'p')`,
      [generatedSchema],
    );
    expect(rows.map(({ relname }) => relname)).toEqual(
      expect.arrayContaining(Object.values(Prisma.ModelName)),
    );
  });

  it('creates the partial unique subscription-period index', async () => {
    const { rows } = await admin.query<{ indexdef: string }>(
      `SELECT indexdef FROM pg_catalog.pg_indexes
       WHERE schemaname = $1 AND tablename = $2 AND indexname = $3`,
      [generatedSchema, 'Invoice', 'Invoice_subscription_period_active_key'],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.indexdef).toContain('UNIQUE INDEX');
    expect(rows[0]?.indexdef).toContain('("subscriptionId", "periodStart")');
    expect(rows[0]?.indexdef).toMatch(/WHERE.*status.*<>.*'CANCELLED'/u);
  });

  it.each(['DRAFT', 'CONFIRMED', 'PAID'] as const)(
    'rejects a duplicate subscription-period for a %s invoice with P2002',
    async (status) => {
      const ids = await fixture();
      await client.invoice.create({ data: { ...invoiceData(ids), status } });
      await expect(
        client.invoice.create({ data: invoiceData(ids) }),
      ).rejects.toMatchObject({
        code: 'P2002',
      });
    },
  );

  it('allows regeneration after cancellation but rejects another current invoice', async () => {
    const ids = await fixture();
    const original = await client.invoice.create({ data: invoiceData(ids) });
    await client.invoice.update({
      where: { id: original.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    const replacement = await client.invoice.create({
      data: { ...invoiceData(ids), regeneratedFromId: original.id },
    });
    expect(replacement.id).not.toBe(original.id);
    expect(replacement.status).toBe('DRAFT');
    await expect(
      client.invoice.create({ data: invoiceData(ids) }),
    ).rejects.toMatchObject({
      code: 'P2002',
    });
  });

  it('permits multiple current invoices with null subscription IDs for the same period', async () => {
    const ids = { ...(await fixture()), subscriptionId: null };
    const first = await client.invoice.create({ data: invoiceData(ids) });
    const second = await client.invoice.create({ data: invoiceData(ids) });
    expect(first.subscriptionId).toBeNull();
    expect(second.subscriptionId).toBeNull();
    expect(second.id).not.toBe(first.id);
  });
});
