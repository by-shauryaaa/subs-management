import { hash } from '@node-rs/argon2';
import type { Prisma, PrismaClient } from '@prisma/client';
import {
  DEFAULT_AUTO_CONFIRM_INVOICES,
  DEFAULT_CURRENCY,
  DEFAULT_INVOICE_FOOTER,
  DEFAULT_QUOTATION_VALIDITY_DAYS,
  DEFAULT_TIMEZONE,
} from '@brightloop/shared';

/** PRD ADM-01 defaults. Keys are the `Setting.key` contract (ARCHITECTURE §5). */
export const DEFAULT_SETTINGS = {
  companyName: 'Brightloop',
  companyAddress: '',
  companyTaxId: '',
  currency: DEFAULT_CURRENCY,
  timezone: DEFAULT_TIMEZONE,
  autoConfirmInvoices: DEFAULT_AUTO_CONFIRM_INVOICES,
  defaultQuotationValidityDays: DEFAULT_QUOTATION_VALIDITY_DAYS,
  invoiceFooter: DEFAULT_INVOICE_FOOTER,
} satisfies Record<string, Prisma.InputJsonValue>;

const TAXES = [
  { name: 'GST 5%', rate: '5.00', description: 'Goods and Services Tax 5%' },
  { name: 'GST 12%', rate: '12.00', description: 'Goods and Services Tax 12%' },
  { name: 'GST 18%', rate: '18.00', description: 'Goods and Services Tax 18%' },
] as const;

const PAYMENT_TERMS = [
  { name: 'Immediate', dueDays: 0 },
  { name: 'Net 15', dueDays: 15 },
  { name: 'Net 30', dueDays: 30 },
] as const;

const BRAND_VALUES = [
  { name: 'Odoo', priceExtra: '560.00' },
  { name: 'Generic', priceExtra: '0.00' },
] as const;

export interface BaseSeedOptions {
  adminEmail: string;
  adminPassword: string;
}

/**
 * Admin, settings, taxes, payment terms and the Brand attribute.
 * Idempotent: existing rows (including admin edits to settings) are left as they are.
 */
export async function seedBase(
  prisma: PrismaClient,
  { adminEmail, adminPassword }: BaseSeedOptions,
): Promise<void> {
  const email = adminEmail.trim().toLowerCase();
  const existingAdmin = await prisma.user.findUnique({ where: { email } });
  if (!existingAdmin) {
    // @node-rs/argon2 defaults to argon2id and emits a standard PHC string.
    await prisma.user.create({
      data: {
        email,
        name: 'Brightloop Admin',
        role: 'ADMIN',
        passwordHash: await hash(adminPassword),
      },
    });
  }

  await prisma.$transaction([
    ...Object.entries(DEFAULT_SETTINGS).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: {},
      }),
    ),
    ...TAXES.map((tax) =>
      prisma.tax.upsert({
        where: { name: tax.name },
        create: tax,
        update: {},
      }),
    ),
    ...PAYMENT_TERMS.map((term) =>
      prisma.paymentTerm.upsert({
        where: { name: term.name },
        create: term,
        update: {},
      }),
    ),
  ]);

  const brand = await prisma.productAttribute.upsert({
    where: { name: 'Brand' },
    create: { name: 'Brand' },
    update: {},
  });
  await prisma.$transaction(
    BRAND_VALUES.map((value) =>
      prisma.attributeValue.upsert({
        where: {
          attributeId_name: { attributeId: brand.id, name: value.name },
        },
        create: { ...value, attributeId: brand.id },
        update: {},
      }),
    ),
  );
}
