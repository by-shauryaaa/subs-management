import { Prisma } from '@prisma/client';
import { addPeriods, periodStart, priceDocument } from '@brightloop/shared';
import { isUniqueViolation } from '../../common/errors/prisma-errors.js';
import { readSettings } from '../config/config.controllers.js';
import { nextNumber, toDate, toIso } from '../subscriptions/numbering.js';

/**
 * INV-01..03: invoice for billing period `n` of a subscription, snapshotting
 * lines, taxes and the customer. Returns null if that period is already billed
 * (the partial unique index on (subscriptionId, periodStart) is the guarantee).
 */
export async function createInvoiceForPeriod(
  tx: Prisma.TransactionClient,
  subscriptionId: string,
  n: number,
  actorId: string | null,
): Promise<{ id: string; number: string } | null> {
  const sub = await tx.subscription.findUniqueOrThrow({
    where: { id: subscriptionId },
    include: {
      plan: true,
      paymentTerm: true,
      customer: { include: { user: { select: { name: true, email: true } } } },
      lines: { include: { taxes: true }, orderBy: { sequence: 'asc' } },
    },
  });
  const start = toIso(sub.startDate);
  const from = periodStart(start, sub.plan.billingPeriod, n);
  const existing = await tx.invoice.findFirst({
    where: {
      subscriptionId,
      periodStart: toDate(from),
      status: { not: 'CANCELLED' },
    },
    select: { id: true },
  });
  if (existing) return null;

  const settings = await readSettings(tx);
  const pricing = priceDocument(
    sub.lines.map((l) => ({
      quantity: l.quantity,
      unitPrice: l.unitPrice.toFixed(2),
      taxes: l.taxes.map((t) => ({
        id: t.id,
        name: t.name,
        rate: t.rate.toFixed(2),
      })),
    })),
  );
  const confirm = settings.autoConfirmInvoices !== false;
  const number = await nextNumber(tx, 'INV', from.slice(0, 4));
  try {
    const invoice = await tx.invoice.create({
      data: {
        number,
        customerId: sub.customerId,
        subscriptionId,
        status: confirm ? 'CONFIRMED' : 'DRAFT',
        confirmedAt: confirm ? new Date() : null,
        invoiceDate: toDate(from),
        dueDate: toDate(addPeriods(from, 'DAILY', sub.paymentTerm.dueDays)),
        periodStart: toDate(from),
        periodEnd: toDate(periodStart(start, sub.plan.billingPeriod, n + 1)),
        customerSnapshot: {
          name: sub.customer.user.name,
          email: sub.customer.user.email,
          companyName: sub.customer.companyName,
          billingAddress: sub.customer.billingAddress,
          taxId: sub.customer.taxId,
        },
        currency: settings.currency ?? 'INR',
        subtotal: pricing.subtotal,
        discountTotal: pricing.discountTotal,
        taxTotal: pricing.taxTotal,
        total: pricing.total,
        lines: {
          create: sub.lines.map((l, i) => {
            const priced = pricing.lines[i]!;
            return {
              variantId: l.variantId,
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              subtotal: priced.subtotal,
              discountAmount: priced.discountAmount,
              taxAmount: priced.taxAmount,
              total: priced.total,
              taxes: priced.taxes,
              discounts: [],
              sequence: i,
            };
          }),
        },
      },
      select: { id: true, number: true },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        entityType: 'Invoice',
        entityId: invoice.id,
        action: 'created',
        toStatus: confirm ? 'CONFIRMED' : 'DRAFT',
        meta: { subscriptionId, period: n, periodStart: from },
      },
    });
    return invoice;
  } catch (error) {
    if (isUniqueViolation(error)) return null;
    throw error;
  }
}
