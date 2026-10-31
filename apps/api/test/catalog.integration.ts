import {
  createProductSchema,
  paginationQuerySchema,
  productListQuerySchema,
  variantPickerQuerySchema,
} from '@brightloop/shared';
import { seedBase } from '../prisma/seed/base.js';
import { AttributesService } from '../src/modules/attributes/attributes.service.js';
import { ProductsService } from '../src/modules/products/products.service.js';
import { VariantsService } from '../src/modules/products/variants.service.js';
import { createTestDatabase } from './support/test-database.js';

const db = createTestDatabase();
const products = new ProductsService(db.client);
const variants = new VariantsService(db.client);
const attributes = new AttributesService(db.client);

const product = (name: string, extra: Record<string, unknown> = {}) =>
  createProductSchema.parse({
    name,
    type: 'SERVICE',
    salesPrice: '1000.00',
    costPrice: '400.00',
    ...extra,
  });

async function brandValue(name: string): Promise<string> {
  const value = await db.client.attributeValue.findFirstOrThrow({
    where: { name, attribute: { name: 'Brand' } },
  });
  return value.id;
}

describe('catalog services', () => {
  let gst18: string;

  beforeAll(async () => {
    await db.setup();
    await seedBase(db.client, {
      adminEmail: 'admin@brightloop.test',
      adminPassword: 'Admin@12345',
    });
    gst18 = (
      await db.client.tax.findUniqueOrThrow({ where: { name: 'GST 18%' } })
    ).id;
  });
  afterAll(() => db.teardown());

  it('creates a product with taxes and an automatic Default variant', async () => {
    const created = await products.create(
      product('CRM Suite', { taxIds: [gst18] }),
    );
    expect(created).toMatchObject({
      salesPrice: '1000.00',
      costPrice: '400.00',
      taxes: [{ id: gst18, name: 'GST 18%', rate: '18.00' }],
      variantCount: 1,
      variants: [
        {
          name: 'Default',
          isDefault: true,
          priceExtra: '0.00',
          price: '1000.00',
        },
      ],
    });
  });

  it('rejects unknown taxes', async () => {
    await expect(
      products.create(
        product('Bad', { taxIds: ['00000000-0000-4000-8000-000000000000'] }),
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', httpStatus: 400 });
  });

  it('prices the Brand=Odoo variant at 1,560 and validates combinations (CAT-03)', async () => {
    const { id } = await products.create(product('Helpdesk'));
    const odoo = await variants.create(id, {
      attributeValueIds: [await brandValue('Odoo')],
    });
    expect(odoo).toMatchObject({
      name: 'Odoo',
      priceExtra: '560.00',
      price: '1560.00',
      attributeValues: [{ attributeName: 'Brand', name: 'Odoo' }],
    });
    await expect(
      variants.create(id, { attributeValueIds: [await brandValue('Odoo')] }),
    ).rejects.toMatchObject({ code: 'VARIANT_EXISTS', httpStatus: 409 });
    await expect(
      variants.create(id, {
        attributeValueIds: [
          await brandValue('Odoo'),
          await brandValue('Generic'),
        ],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    const generic = await variants.create(id, {
      attributeValueIds: [await brandValue('Generic')],
      name: 'Generic edition',
      priceExtra: '25.50',
    });
    expect(generic).toMatchObject({
      name: 'Generic edition',
      price: '1025.50',
    });
    expect((await variants.listForProduct(id)).map((v) => v.name)).toEqual([
      'Default',
      'Generic edition',
      'Odoo',
    ]);
  });

  it('picker returns final prices and hides archived items', async () => {
    const { id } = await products.create(product('Zeta Analytics'));
    const page = await variants.picker(
      variantPickerQuerySchema.parse({ q: 'odoo' }),
    );
    expect(page.data).toEqual([
      expect.objectContaining({
        productName: 'Helpdesk',
        label: 'Helpdesk (Odoo)',
        price: '1560.00',
      }),
    ]);
    await products.update(id, { isActive: false });
    const zeta = await variants.picker(
      variantPickerQuerySchema.parse({ q: 'zeta' }),
    );
    expect(zeta.meta.total).toBe(0);
  });

  it('protects the default variant', async () => {
    const created = await products.create(product('Solo'));
    const defaultId = created.variants[0]!.id;
    await expect(
      variants.update(defaultId, { isActive: false }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(variants.remove(defaultId)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('deletes unused products but requires archiving in-use ones (CAT-04)', async () => {
    const unused = await products.create(product('Throwaway'));
    await products.remove(unused.id);
    await expect(products.get(unused.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });

    const used = await products.create(product('In use'));
    const template = await db.client.quotationTemplate.create({
      data: {
        name: 'T',
        validityDays: 30,
        plan: {
          create: { name: 'Monthly', price: '0', billingPeriod: 'MONTHLY' },
        },
        lines: { create: { variantId: used.variants[0]!.id, quantity: 1 } },
      },
    });
    expect(template.id).toBeDefined();
    await expect(products.remove(used.id)).rejects.toMatchObject({
      code: 'IN_USE_ARCHIVE_INSTEAD',
      httpStatus: 409,
    });
    const archived = await products.update(used.id, { isActive: false });
    expect(archived.isActive).toBe(false);
  });

  it('lists products with search, filters and sorting', async () => {
    const active = await products.list(
      productListQuerySchema.parse({ isActive: 'true', sort: 'name:desc' }),
    );
    expect(active.data.every((p) => p.isActive)).toBe(true);
    expect(active.data[0]!.name).toBe('Solo');
    const search = await products.list(
      productListQuerySchema.parse({ q: 'help' }),
    );
    expect(search.data.map((p) => [p.name, p.variantCount])).toEqual([
      ['Helpdesk', 3],
    ]);
  });

  it('manages attributes and values with unique names', async () => {
    const size = await attributes.create({
      name: 'Seats',
      values: [
        { name: '10', priceExtra: '0.00' },
        { name: '50', priceExtra: '2000.00' },
      ],
    });
    expect(size.values.map((v) => [v.name, v.priceExtra])).toEqual([
      ['10', '0.00'],
      ['50', '2000.00'],
    ]);
    await expect(
      attributes.create({ name: 'Seats', values: [] }),
    ).rejects.toMatchObject({ code: 'NAME_TAKEN', httpStatus: 409 });
    const hundred = await attributes.addValue(size.id, {
      name: '100',
      priceExtra: '3500.00',
    });
    await expect(
      attributes.addValue(size.id, { name: '100', priceExtra: '0.00' }),
    ).rejects.toMatchObject({ code: 'NAME_TAKEN' });
    expect(
      (await attributes.updateValue(hundred.id, { priceExtra: '3000.00' }))
        .priceExtra,
    ).toBe('3000.00');
    const list = await attributes.list(paginationQuerySchema.parse({}));
    expect(list.data.map((a) => a.name)).toEqual(['Brand', 'Seats']);
  });
});
