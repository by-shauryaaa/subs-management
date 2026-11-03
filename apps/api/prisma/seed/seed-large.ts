import { Prisma, type PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

export async function seedLarge(prisma: PrismaClient): Promise<void> {
  const [plans, terms, variants, taxes, admin] = await Promise.all([
    prisma.plan.findMany(),
    prisma.paymentTerm.findMany(),
    prisma.productVariant.findMany({
      include: { product: { include: { taxes: true } } },
    }),
    prisma.tax.findMany(),
    prisma.user.findFirst({ where: { role: 'ADMIN' } }),
  ]);

  if (plans.length === 0 || terms.length === 0 || variants.length === 0 || !admin) {
    throw new Error('Base catalog, configuration and admin user must be seeded first');
  }

  const defaultPlan = plans[0]!;
  const defaultTerm = terms[0]!;
  const defaultTax = taxes[0];

  // 1. Seed Quotation Templates
  const templateDefs = [
    {
      name: 'Enterprise Cloud Pack',
      validityDays: 45,
      plan: plans.find((p) => p.name.includes('Pro')) ?? defaultPlan,
      term: terms.find((t) => t.dueDays === 30) ?? defaultTerm,
      notes: 'Standard enterprise quoting package with hosting & CRM.',
    },
    {
      name: 'Agency Starter Bundle',
      validityDays: 30,
      plan: plans.find((p) => p.name.includes('Starter')) ?? defaultPlan,
      term: terms.find((t) => t.dueDays === 15) ?? defaultTerm,
      notes: 'Quick turnaround quote for digital agencies.',
    },
    {
      name: 'Annual Scale Deal',
      validityDays: 14,
      plan: plans.find((p) => p.name.includes('Business') || p.name.includes('Yearly')) ?? defaultPlan,
      term: terms.find((t) => t.dueDays === 30) ?? defaultTerm,
      notes: 'Discounted annual billing commitment.',
    },
  ];

  for (const t of templateDefs) {
    const existing = await prisma.quotationTemplate.findFirst({
      where: { name: t.name },
    });
    if (!existing) {
      await prisma.quotationTemplate.create({
        data: {
          name: t.name,
          validityDays: t.validityDays,
          planId: t.plan.id,
          paymentTermId: t.term.id,
          notes: t.notes,
          isActive: true,
          lines: {
            create: variants.slice(0, 2).map((v, idx) => ({
              variantId: v.id,
              quantity: idx + 1,
              sequence: idx,
            })),
          },
        },
      });
    }
  }

  // 2. Seed Discounts
  const discountDefs = [
    {
      name: 'Welcome Special 10%',
      code: 'WELCOME10',
      type: 'PERCENTAGE' as const,
      value: new Prisma.Decimal('10.00'),
      scope: 'SUBSCRIPTION' as const,
      minPurchase: new Prisma.Decimal('500.00'),
      usageLimit: 1000,
    },
    {
      name: 'Summer Promo Flat ₹500',
      code: 'SUMMER2026',
      type: 'FIXED' as const,
      value: new Prisma.Decimal('500.00'),
      scope: 'SUBSCRIPTION' as const,
      minPurchase: new Prisma.Decimal('2000.00'),
      usageLimit: 500,
    },
    {
      name: 'Cloud Hosting Volume 15%',
      code: 'VOLUME15',
      type: 'PERCENTAGE' as const,
      value: new Prisma.Decimal('15.00'),
      scope: 'PRODUCTS' as const,
      minQuantity: 3,
      usageLimit: 250,
    },
  ];

  for (const d of discountDefs) {
    const exists = await prisma.discount.findUnique({
      where: { code: d.code },
    });
    if (!exists) {
      await prisma.discount.create({
        data: {
          name: d.name,
          code: d.code,
          type: d.type,
          value: d.value,
          scope: d.scope,
          minPurchase: d.minPurchase,
          minQuantity: d.minQuantity,
          usageLimit: d.usageLimit,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
          isActive: true,
        },
      });
    }
  }

  // 3. Check if large seed already ran
  const currentSubCount = await prisma.subscription.count();
  if (currentSubCount >= 50) {
    return;
  }

  // 4. Create 50 Customers
  const customerPasswordHash = await hash('CustomerPass123!');
  const createdCustomers: { id: string; userId: string; name: string }[] = [];

  for (let i = 1; i <= 50; i++) {
    const email = `client${i}@example.org`;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: `Client Org ${i}`,
          role: 'CUSTOMER',
          passwordHash: customerPasswordHash,
          isActive: true,
        },
      });
    }
    let cust = await prisma.customer.findUnique({ where: { userId: user.id } });
    if (!cust) {
      cust = await prisma.customer.create({
        data: {
          userId: user.id,
          companyName: `Apex Enterprise ${i}`,
          phone: `+91 98765 432${(i % 90).toString().padStart(2, '0')}`,
          billingAddress: `${100 + i}, Tech Boulevard, Bengaluru, Karnataka, 560103`,
          taxId: `29ABCDE${(1000 + i).toString()}1Z5`,
        },
      });
    }
    createdCustomers.push({ id: cust.id, userId: user.id, name: user.name });
  }

  // 5. Create 100 Subscriptions across various statuses
  const statuses: ('ACTIVE' | 'QUOTATION' | 'DRAFT' | 'PAUSED' | 'CLOSED')[] = [
    'ACTIVE',
    'ACTIVE',
    'ACTIVE',
    'QUOTATION',
    'DRAFT',
    'PAUSED',
    'CLOSED',
  ];

  const qTemplates = await prisma.quotationTemplate.findMany();

  for (let i = 1; i <= 100; i++) {
    const cust = createdCustomers[(i - 1) % createdCustomers.length]!;
    const plan = plans[(i - 1) % plans.length]!;
    const term = terms[(i - 1) % terms.length]!;
    const status = statuses[(i - 1) % statuses.length]!;
    const template = qTemplates[(i - 1) % qTemplates.length];
    const variant = variants[(i - 1) % variants.length]!;
    const subNumber = `SUB/2026/${(1000 + i).toString().padStart(5, '0')}`;

    const startDate = new Date('2026-01-01');
    startDate.setDate(startDate.getDate() + (i % 60));

    const sub = await prisma.subscription.upsert({
      where: { number: subNumber },
      create: {
        number: subNumber,
        customerId: cust.id,
        planId: plan.id,
        paymentTermId: term.id,
        quotationTemplateId: template?.id ?? null,
        status,
        startDate,
        billingCycleIndex: status === 'ACTIVE' ? 3 : 0,
        nextBillingDate: status === 'ACTIVE' ? new Date('2026-05-01') : null,
        activatedAt: status === 'ACTIVE' ? startDate : null,
        confirmedAt: status === 'ACTIVE' || status === 'CLOSED' ? startDate : null,
        notes: `Enterprise account ${i}`,
        lines: {
          create: [
            {
              description: `${plan.name} Base Fee`,
              quantity: 1,
              unitPrice: plan.price,
              isPlanFee: true,
              sequence: 0,
            },
            {
              variantId: variant.id,
              description: `${variant.product.name} Service Line`,
              quantity: Math.max(plan.minQuantity, (i % 5) + 1),
              unitPrice: variant.product.salesPrice,
              sequence: 1,
              taxes: defaultTax ? { connect: [{ id: defaultTax.id }] } : undefined,
            },
          ],
        },
      },
      update: {},
    });

    // 6. Generate invoices for ACTIVE subscriptions
    if (status === 'ACTIVE') {
      for (let cycle = 0; cycle < 3; cycle++) {
        const invNumber = `INV/2026/${(10000 + i * 10 + cycle).toString()}`;
        const periodStart = new Date(startDate);
        periodStart.setMonth(periodStart.getMonth() + cycle);
        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        const invStatus = cycle === 0 ? 'PAID' : cycle === 1 ? 'CONFIRMED' : 'DRAFT';
        const subtotal = plan.price.add(new Prisma.Decimal(1000));
        const taxAmount = subtotal.mul(new Prisma.Decimal(0.18));
        const total = subtotal.add(taxAmount);

        const invoice = await prisma.invoice.upsert({
          where: { number: invNumber },
          create: {
            number: invNumber,
            subscriptionId: sub.id,
            customerId: cust.id,
            status: invStatus,
            invoiceDate: periodStart,
            dueDate: new Date(periodStart.getTime() + term.dueDays * 86400000),
            periodStart,
            periodEnd,
            customerSnapshot: {
              name: cust.name,
              email: `client${i}@example.org`,
              companyName: `Apex Enterprise ${i}`,
              billingAddress: `${100 + i}, Tech Boulevard, Bengaluru, Karnataka, 560103`,
              taxId: `29ABCDE${(1000 + i).toString()}1Z5`,
            },
            currency: 'INR',
            subtotal,
            discountTotal: new Prisma.Decimal('0.00'),
            taxTotal: taxAmount,
            total,
            amountPaid: invStatus === 'PAID' ? total : new Prisma.Decimal('0.00'),
            paidAt: invStatus === 'PAID' ? periodStart : null,
            confirmedAt: invStatus === 'CONFIRMED' || invStatus === 'PAID' ? periodStart : null,
            lines: {
              create: [
                {
                  description: `${plan.name} Billing Period #${cycle + 1}`,
                  quantity: 1,
                  unitPrice: subtotal,
                  subtotal,
                  discountAmount: new Prisma.Decimal('0.00'),
                  taxAmount,
                  total,
                  taxes: [],
                  discounts: [],
                  sequence: 0,
                },
              ],
            },
          },
          update: {},
        });

        // 7. Generate payment for PAID invoices
        if (invStatus === 'PAID') {
          const existingPay = await prisma.payment.findFirst({
            where: { invoiceId: invoice.id },
          });
          if (!existingPay) {
            await prisma.payment.create({
              data: {
                invoiceId: invoice.id,
                amount: total,
                paymentDate: periodStart,
                method: i % 2 === 0 ? 'CARD' : 'BANK_TRANSFER',
                note: `REF-LARGE-${i}-${cycle}`,
                recordedById: admin.id,
              },
            });
          }
        }
      }
    }
  }
}
