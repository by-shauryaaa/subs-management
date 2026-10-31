import type { PrismaClient } from '@prisma/client';
import { addPeriods, todayInTz } from '@brightloop/shared';
import { SubscriptionsService } from '../../src/modules/subscriptions/subscriptions.service.js';

const PLANS = [
  {
    name: 'Monthly Starter',
    price: '499.00',
    billingPeriod: 'MONTHLY',
    minQuantity: 1,
    pausable: false,
  },
  {
    name: 'Monthly Pro',
    price: '999.00',
    billingPeriod: 'MONTHLY',
    minQuantity: 1,
    pausable: true,
  },
  {
    name: 'Yearly Business',
    price: '9999.00',
    billingPeriod: 'YEARLY',
    minQuantity: 5,
    pausable: false,
  },
  {
    name: 'Weekly Trial',
    price: '0.00',
    billingPeriod: 'WEEKLY',
    minQuantity: 1,
    pausable: false,
  },
] as const;

/**
 * Plans plus demo subscriptions in every status, with invoices (some overdue,
 * some paid). Skipped entirely once any subscription exists.
 */
export async function seedSubscriptions(
  prisma: PrismaClient,
  adminEmail: string,
): Promise<void> {
  for (const plan of PLANS) {
    if (!(await prisma.plan.findFirst({ where: { name: plan.name } }))) {
      await prisma.plan.create({ data: plan });
    }
  }
  if (await prisma.subscription.count()) return;

  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: adminEmail.trim().toLowerCase() },
  });
  const service = new SubscriptionsService(prisma);
  const today = todayInTz('Asia/Kolkata');
  const [customers, plans, terms, variants] = await Promise.all([
    prisma.customer.findMany({ orderBy: { createdAt: 'asc' }, take: 8 }),
    prisma.plan.findMany(),
    prisma.paymentTerm.findMany(),
    prisma.productVariant.findMany({
      include: { product: { include: { taxes: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);
  const plan = (name: string) => plans.find((p) => p.name === name)!;
  const term = (name: string) => terms.find((t) => t.name === name)!;
  const line = (product: string, variant: string, quantity: number) => {
    const v = variants.find(
      (x) => x.product.name === product && x.name === variant,
    )!;
    return {
      variantId: v.id,
      description: variant === 'Default' ? product : `${product} (${variant})`,
      quantity,
      unitPrice: v.product.salesPrice.plus(v.priceExtra).toFixed(2),
      taxIds: v.product.taxes.map((t) => t.id),
    };
  };

  const scenarios = [
    {
      c: 0,
      plan: 'Monthly Pro',
      term: 'Net 15',
      start: addPeriods(today, 'MONTHLY', -3),
      lines: [line('Brightloop CRM', 'Odoo', 5)],
      to: ['confirm', 'activate'],
    },
    {
      c: 1,
      plan: 'Monthly Starter',
      term: 'Net 30',
      start: addPeriods(today, 'MONTHLY', -2),
      lines: [line('Helpdesk Pro', 'Generic', 3)],
      to: ['confirm', 'activate'],
    },
    {
      c: 2,
      plan: 'Yearly Business',
      term: 'Net 30',
      start: addPeriods(today, 'MONTHLY', -1),
      lines: [line('Cloud Hosting', 'Odoo', 5)],
      to: ['confirm', 'activate'],
    },
    {
      c: 3,
      plan: 'Monthly Pro',
      term: 'Immediate',
      start: addPeriods(today, 'MONTHLY', -2),
      lines: [line('Barcode Scanner', 'Generic', 2)],
      to: ['confirm', 'activate', 'pause'],
    },
    {
      c: 4,
      plan: 'Monthly Starter',
      term: 'Net 15',
      start: today,
      lines: [line('Brightloop CRM', 'Generic', 2)],
      to: ['send', 'confirm'],
    },
    {
      c: 5,
      plan: 'Monthly Pro',
      term: 'Net 15',
      start: today,
      lines: [line('Helpdesk Pro', 'Odoo', 4)],
      to: ['send'],
    },
    {
      c: 6,
      plan: 'Weekly Trial',
      term: 'Immediate',
      start: today,
      lines: [line('Onboarding Workshop', 'Default', 1)],
      to: [],
    },
    {
      c: 7,
      plan: 'Monthly Starter',
      term: 'Net 15',
      start: addPeriods(today, 'MONTHLY', -1),
      lines: [line('Brightloop CRM', 'Default', 1)],
      to: ['confirm', 'activate', 'close'],
    },
  ] as const;

  for (const s of scenarios) {
    const customer = customers[s.c];
    if (!customer) continue;
    const sub = await service.create(
      {
        customerId: customer.id,
        planId: plan(s.plan).id,
        paymentTermId: term(s.term).id,
        startDate: s.start,
        lines: s.lines.map((l) => ({ ...l })),
      },
      admin.id,
    );
    for (const action of s.to)
      await service.transition(sub.id, action, admin.id);
  }

  // Pay the oldest invoice of the first two customers in full and one partially.
  const invoices = await prisma.invoice.findMany({
    where: { status: 'CONFIRMED' },
    orderBy: { invoiceDate: 'asc' },
    take: 3,
  });
  for (const [i, inv] of invoices.entries()) {
    const amount =
      i === 2 ? inv.total.dividedBy(2).toDecimalPlaces(2) : inv.total;
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          invoiceId: inv.id,
          amount,
          method: 'UPI',
          paymentDate:
            inv.dueDate > new Date()
              ? new Date(`${today}T00:00:00Z`)
              : inv.dueDate,
          recordedById: admin.id,
        },
      }),
      prisma.invoice.update({
        where: { id: inv.id },
        data: {
          amountPaid: amount,
          ...(i < 2 ? { status: 'PAID', paidAt: new Date() } : {}),
        },
      }),
    ]);
  }
}
