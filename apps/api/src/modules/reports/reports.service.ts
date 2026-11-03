import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  d,
  dateStringSchema,
  paginationQuerySchema,
  round2,
  todayInTz,
  toMoneyString,
} from '@brightloop/shared';
import { paginate } from '../../common/pagination/pagination.helper.js';
import { pageArgs } from '../../common/pagination/page.js';
import { readSettings } from '../config/config.controllers.js';
import { toIso, toDate } from '../subscriptions/numbering.js';

export const reportFilterSchema = z.object({
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
  planId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
});

export const overdueReportQuerySchema = paginationQuerySchema.extend({
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
  planId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
});

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaClient) {}

  private async today() {
    const settings = await readSettings(this.prisma);
    return todayInTz(settings.timezone as string | undefined);
  }

  async summary(query: z.infer<typeof reportFilterSchema>) {
    const today = await this.today();
    const todayDate = toDate(today);

    // Active subscriptions count
    const activeSubsWhere: Prisma.SubscriptionWhereInput = {
      status: 'ACTIVE',
      planId: query.planId,
      customerId: query.customerId,
    };
    const activeSubscriptions = await this.prisma.subscription.count({
      where: activeSubsWhere,
    });

    // MRR calculation (PRD RPT-05)
    const activeSubs = await this.prisma.subscription.findMany({
      where: activeSubsWhere,
      select: {
        plan: { select: { billingPeriod: true } },
        lines: { select: { quantity: true, unitPrice: true } },
      },
    });

    let mrrTotal = d(0);
    for (const sub of activeSubs) {
      let subLineSum = d(0);
      for (const line of sub.lines) {
        subLineSum = subLineSum.plus(d(line.unitPrice.toString()).times(line.quantity));
      }
      switch (sub.plan.billingPeriod) {
        case 'DAILY':
          mrrTotal = mrrTotal.plus(subLineSum.times(30));
          break;
        case 'WEEKLY':
          mrrTotal = mrrTotal.plus(subLineSum.times(52).dividedBy(12));
          break;
        case 'MONTHLY':
          mrrTotal = mrrTotal.plus(subLineSum);
          break;
        case 'YEARLY':
          mrrTotal = mrrTotal.plus(subLineSum.dividedBy(12));
          break;
      }
    }

    // Revenue collected (payments)
    const paymentsWhere: Prisma.PaymentWhereInput = {
      ...(query.from || query.to
        ? {
            paymentDate: {
              gte: query.from ? toDate(query.from) : undefined,
              lte: query.to ? toDate(query.to) : undefined,
            },
          }
        : {}),
      ...(query.customerId || query.planId
        ? {
            invoice: {
              customerId: query.customerId,
              subscription: query.planId ? { planId: query.planId } : undefined,
            },
          }
        : {}),
    };

    const paymentRows = await this.prisma.payment.findMany({
      where: paymentsWhere,
      select: { amount: true },
    });
    const revenueCollected = paymentRows.reduce(
      (acc, curr) => acc.plus(d(curr.amount.toString())),
      d(0),
    );

    // Invoiced and Outstanding
    const invoicesWhere: Prisma.InvoiceWhereInput = {
      status: { in: ['CONFIRMED', 'PAID'] },
      ...(query.from || query.to
        ? {
            invoiceDate: {
              gte: query.from ? toDate(query.from) : undefined,
              lte: query.to ? toDate(query.to) : undefined,
            },
          }
        : {}),
      customerId: query.customerId,
      subscription: query.planId ? { planId: query.planId } : undefined,
    };

    const invoices = await this.prisma.invoice.findMany({
      where: invoicesWhere,
      select: {
        total: true,
        amountPaid: true,
        dueDate: true,
        status: true,
      },
    });

    let invoicedTotal = d(0);
    let outstandingTotal = d(0);
    let overdueTotal = d(0);

    for (const inv of invoices) {
      const total = d(inv.total.toString());
      const paid = d(inv.amountPaid.toString());
      const due = total.minus(paid);

      invoicedTotal = invoicedTotal.plus(total);
      if (inv.status === 'CONFIRMED' && due.greaterThan(0)) {
        outstandingTotal = outstandingTotal.plus(due);
        if (inv.dueDate < todayDate) {
          overdueTotal = overdueTotal.plus(due);
        }
      }
    }

    return {
      activeSubscriptions,
      mrr: toMoneyString(round2(mrrTotal)),
      revenueCollected: toMoneyString(round2(revenueCollected)),
      invoiced: toMoneyString(round2(invoicedTotal)),
      outstanding: toMoneyString(round2(outstandingTotal)),
      overdueAmount: toMoneyString(round2(overdueTotal)),
    };
  }

  async revenueSeries(query: z.infer<typeof reportFilterSchema>) {
    const paymentsWhere: Prisma.PaymentWhereInput = {
      ...(query.from || query.to
        ? {
            paymentDate: {
              gte: query.from ? toDate(query.from) : undefined,
              lte: query.to ? toDate(query.to) : undefined,
            },
          }
        : {}),
      ...(query.customerId || query.planId
        ? {
            invoice: {
              customerId: query.customerId,
              subscription: query.planId ? { planId: query.planId } : undefined,
            },
          }
        : {}),
    };

    const payments = await this.prisma.payment.findMany({
      where: paymentsWhere,
      select: {
        amount: true,
        paymentDate: true,
      },
      orderBy: { paymentDate: 'asc' },
    });

    const monthMap = new Map<string, number>();

    // If no payments, return default recent months
    if (!payments.length) {
      const today = await this.today();
      const year = parseInt(today.slice(0, 4), 10);
      for (let m = 1; m <= 12; m++) {
        const monthKey = `${year}-${String(m).padStart(2, '0')}`;
        monthMap.set(monthKey, 0);
      }
    } else {
      for (const p of payments) {
        const monthKey = toIso(p.paymentDate).slice(0, 7);
        const current = monthMap.get(monthKey) ?? 0;
        monthMap.set(monthKey, current + Number(p.amount));
      }
    }

    return Array.from(monthMap.entries()).map(([month, amount]) => ({
      month,
      amount: Math.round(amount * 100) / 100,
    }));
  }

  async subscriptionsByStatus(query: z.infer<typeof reportFilterSchema>) {
    const where: Prisma.SubscriptionWhereInput = {
      planId: query.planId,
      customerId: query.customerId,
      ...(query.from || query.to
        ? {
            startDate: {
              gte: query.from ? toDate(query.from) : undefined,
              lte: query.to ? toDate(query.to) : undefined,
            },
          }
        : {}),
    };

    const groups = await this.prisma.subscription.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    const allStatuses = ['ACTIVE', 'CONFIRMED', 'QUOTATION', 'DRAFT', 'PAUSED', 'CLOSED'];
    const countMap = new Map<string, number>(groups.map((g) => [g.status, g._count._all]));

    return allStatuses.map((status) => ({
      status,
      count: countMap.get(status) ?? 0,
    }));
  }

  async overdue(query: z.infer<typeof overdueReportQuerySchema>) {
    const today = await this.today();
    const todayDate = toDate(today);

    const where: Prisma.InvoiceWhereInput = {
      status: 'CONFIRMED',
      dueDate: { lt: todayDate },
      customerId: query.customerId,
      subscription: query.planId ? { planId: query.planId } : undefined,
      ...(query.from || query.to
        ? {
            invoiceDate: {
              gte: query.from ? toDate(query.from) : undefined,
              lte: query.to ? toDate(query.to) : undefined,
            },
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        include: {
          customer: { include: { user: { select: { name: true } } } },
        },
        orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
        ...pageArgs(query.page, query.pageSize),
      }),
      this.prisma.invoice.count({ where }),
    ]);

    const formatted = rows.map((inv) => {
      const due = d(inv.total.toString()).minus(inv.amountPaid.toString());
      return {
        id: inv.id,
        number: inv.number,
        customerName: inv.customer.user.name,
        dueDate: toIso(inv.dueDate),
        dueAmount: toMoneyString(due),
        status: 'OVERDUE',
      };
    });

    return paginate(formatted, total, query.page, query.pageSize);
  }
}
