import type { PrismaClient } from '@prisma/client';
import { createProductSchema } from '@brightloop/shared';
import { ProductsService } from '../../src/modules/products/products.service.js';
import { VariantsService } from '../../src/modules/products/variants.service.js';

export const SEED_PRODUCTS = [
  {
    name: 'Brightloop CRM',
    type: 'SERVICE',
    salesPrice: '1000.00',
    costPrice: '300.00',
    tax: 'GST 18%',
    brands: ['Odoo', 'Generic'],
    notes: 'Per-seat CRM licence.',
  },
  {
    name: 'Helpdesk Pro',
    type: 'SERVICE',
    salesPrice: '750.00',
    costPrice: '200.00',
    tax: 'GST 18%',
    brands: ['Odoo', 'Generic'],
    notes: 'Ticketing and SLA tracking, per agent.',
  },
  {
    name: 'Cloud Hosting',
    type: 'SERVICE',
    salesPrice: '2500.00',
    costPrice: '1200.00',
    tax: 'GST 18%',
    brands: ['Odoo'],
    notes: 'Managed hosting per instance.',
  },
  {
    name: 'Onboarding Workshop',
    type: 'SERVICE',
    salesPrice: '5000.00',
    costPrice: '1500.00',
    tax: 'GST 18%',
    brands: [],
    notes: 'Half-day remote training session.',
  },
  {
    name: 'Barcode Scanner',
    type: 'GOODS',
    salesPrice: '3200.00',
    costPrice: '2100.00',
    tax: 'GST 12%',
    brands: ['Odoo', 'Generic'],
    notes: 'Handheld 2D scanner, rented monthly.',
  },
] as const;

/**
 * Products with GST defaults and Brand variants (CAT-01..03).
 * Run after `seedBase`; products that already exist (by name) are skipped.
 */
export async function seedCatalog(prisma: PrismaClient): Promise<void> {
  const products = new ProductsService(prisma);
  const variants = new VariantsService(prisma);
  const [taxes, brandValues, existing] = await Promise.all([
    prisma.tax.findMany({ select: { id: true, name: true } }),
    prisma.attributeValue.findMany({
      where: { attribute: { name: 'Brand' } },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { name: { in: SEED_PRODUCTS.map((p) => p.name) } },
      select: { name: true },
    }),
  ]);
  const taxId = new Map(taxes.map((t) => [t.name, t.id]));
  const brandId = new Map(brandValues.map((v) => [v.name, v.id]));
  const skip = new Set(existing.map((p) => p.name));

  for (const seed of SEED_PRODUCTS.filter((p) => !skip.has(p.name))) {
    const { tax, brands, ...fields } = seed;
    const product = await products.create(
      createProductSchema.parse({ ...fields, taxIds: [taxId.get(tax)] }),
    );
    for (const brand of brands) {
      await variants.create(product.id, {
        attributeValueIds: [brandId.get(brand) ?? ''],
      });
    }
  }
}
