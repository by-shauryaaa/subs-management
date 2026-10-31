import { verify } from '@node-rs/argon2';
import { DEFAULT_SETTINGS, seedBase } from '../prisma/seed/base.js';
import { createTestDatabase } from './support/test-database.js';

const db = createTestDatabase();
const { client } = db;
const options = {
  adminEmail: ' Admin@Brightloop.Local ',
  adminPassword: 'Admin@12345',
};

async function counts() {
  const [users, settings, taxes, terms, attributes, values] = await Promise.all(
    [
      client.user.count(),
      client.setting.count(),
      client.tax.count(),
      client.paymentTerm.count(),
      client.productAttribute.count(),
      client.attributeValue.count(),
    ],
  );
  return { users, settings, taxes, terms, attributes, values };
}

describe('base seed', () => {
  beforeAll(async () => {
    await db.setup();
    await seedBase(client, options);
  });
  afterAll(() => db.teardown());

  it('creates the admin with a lower-cased email and an argon2id hash', async () => {
    const admin = await client.user.findUniqueOrThrow({
      where: { email: 'admin@brightloop.local' },
    });
    expect(admin.role).toBe('ADMIN');
    expect(admin.isActive).toBe(true);
    expect(admin.passwordHash).toMatch(/^\$argon2id\$/u);
    await expect(verify(admin.passwordHash ?? '', 'Admin@12345')).resolves.toBe(
      true,
    );
  });

  it('creates the ADM-01 default settings', async () => {
    const rows = await client.setting.findMany();
    expect(
      Object.fromEntries(rows.map(({ key, value }) => [key, value])),
    ).toEqual(DEFAULT_SETTINGS);
  });

  it('creates GST taxes, payment terms and the Brand attribute', async () => {
    const taxes = await client.tax.findMany({ orderBy: { rate: 'asc' } });
    expect(taxes.map((t) => [t.name, t.rate.toFixed(2)])).toEqual([
      ['GST 5%', '5.00'],
      ['GST 12%', '12.00'],
      ['GST 18%', '18.00'],
    ]);
    const terms = await client.paymentTerm.findMany({
      orderBy: { dueDays: 'asc' },
    });
    expect(terms.map((t) => [t.name, t.dueDays])).toEqual([
      ['Immediate', 0],
      ['Net 15', 15],
      ['Net 30', 30],
    ]);
    const brand = await client.productAttribute.findUniqueOrThrow({
      where: { name: 'Brand' },
      include: { values: { orderBy: { name: 'asc' } } },
    });
    expect(brand.values.map((v) => [v.name, v.priceExtra.toFixed(2)])).toEqual([
      ['Generic', '0.00'],
      ['Odoo', '560.00'],
    ]);
  });

  it('is idempotent and keeps admin edits to settings', async () => {
    await client.setting.update({
      where: { key: 'companyName' },
      data: { value: 'Edited Co' },
    });
    const before = await counts();
    await seedBase(client, options);
    expect(await counts()).toEqual(before);
    const company = await client.setting.findUniqueOrThrow({
      where: { key: 'companyName' },
    });
    expect(company.value).toBe('Edited Co');
  });
});
