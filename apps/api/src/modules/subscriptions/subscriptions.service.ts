import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient, type SubscriptionStatus } from '@prisma/client';
import { z } from 'zod';
import {
  type SubscriptionAction,
  SUBSCRIPTION_TRANSITIONS,
  addPeriods,
  allowedActions,
  canTransition,
  dateStringSchema,
  nonNegativeMoneySchema,
  paginationQuerySchema,
  periodStart,
  priceDocument,
  todayInTz,
  SUBSCRIPTION_STATUSES,
} from '@brightloop/shared';
import { DomainError } from '../../common/errors/domain.error.js';
import { notFound } from '../../common/errors/prisma-errors.js';
import { paginate } from '../../common/pagination/pagination.helper.js';
import { pageArgs } from '../../common/pagination/page.js';
import { readSettings } from '../config/config.controllers.js';
import { createInvoiceForPeriod } from '../invoices/invoice-generator.js';
import { nextNumber, toDate, toIso } from './numbering.js';

const lineSchema = z.object({
  variantId: z.uuid().nullish(),
  description: z.string().trim().min(1).max(300),
  quantity: z.coerce.number().int().min(1),
  unitPrice: nonNegativeMoneySchema,
  taxIds: z.array(z.uuid()).default([]),
  isPlanFee: z.boolean().optional(),
});
export const subscriptionSchema = z.object({
  customerId: z.uuid(),
  planId: z.uuid(),
  paymentTermId: z.uuid(),
  startDate: dateStringSchema,
  expiryDate: dateStringSchema.nullish(),
  notes: z.string().trim().max(2000).nullish(),
  lines: z.array(lineSchema).default([]),
});
export type SubscriptionBody = z.infer<typeof subscriptionSchema>;
export const subscriptionListSchema = paginationQuerySchema.extend({
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  customerId: z.uuid().optional(),
  planId: z.uuid().optional(),
});
export const transitionParamsSchema = z.object({
  id: z.uuid(),
  action: z.enum(Object.keys(SUBSCRIPTION_TRANSITIONS) as [SubscriptionAction]),
});
export const transitionBodySchema = z
  .object({ reason: z.string().trim().max(500).optional() })
  .default({});

export type SubscriptionListQuery = z.infer<typeof subscriptionListSchema>;

const detailInclude = {
  customer: { include: { user: { select: { name: true, email: true } } } },
  plan: true,
  paymentTerm: true,
  renewal: { select: { id: true, number: true } },
  lines: {
    include: { taxes: { select: { id: true, name: true, rate: true } } },
    orderBy: { sequence: 'asc' },
  },
  discounts: { include: { discount: true } },
} satisfies Prisma.SubscriptionInclude;
type Detail = Prisma.SubscriptionGetPayload<{ include: typeof detailInclude }>;

const EDITABLE: SubscriptionStatus[] = ['DRAFT', 'QUOTATION'];

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(q: SubscriptionListQuery) {
    const where: Prisma.SubscriptionWhereInput = {
      status: q.status,
      customerId: q.customerId,
      planId: q.planId,
      ...(q.q
        ? {
            OR: [
              { number: { contains: q.q, mode: 'insensitive' } },
              {
                customer: {
                  user: { name: { contains: q.q, mode: 'insensitive' } },
                },
              },
              {
                customer: {
                  companyName: { contains: q.q, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
    const countWhere = { ...where, status: undefined };
    const [rows, total, groups] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where,
        select: {
          id: true,
          number: true,
          status: true,
          startDate: true,
          expiryDate: true,
          nextBillingDate: true,
          customerId: true,
          customer: { select: { user: { select: { name: true } } } },
          plan: { select: { name: true, billingPeriod: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        ...pageArgs(q.page, q.pageSize),
      }),
      this.prisma.subscription.count({ where }),
      this.prisma.subscription.groupBy({
        by: ['status'],
        where: countWhere,
        _count: { _all: true },
        orderBy: { status: 'asc' },
      }),
    ]);
    const page = paginate(
      rows.map((r) => ({
        ...r,
        customer: r.customer.user.name,
        plan: r.plan.name,
        billingPeriod: r.plan.billingPeriod,
        startDate: toIso(r.startDate),
        expiryDate: r.expiryDate && toIso(r.expiryDate),
        nextBillingDate: r.nextBillingDate && toIso(r.nextBillingDate),
      })),
      total,
      q.page,
      q.pageSize,
    );
    const counts = Object.fromEntries(
      groups.map((g) => [g.status, (g._count as { _all: number })._all]),
    );
    return { ...page, meta: { ...page.meta, counts } };
  }

  async get(
    id: string,
    db: PrismaClient | Prisma.TransactionClient = this.prisma,
  ) {
    const sub = await db.subscription.findUnique({
      where: { id },
      include: detailInclude,
    });
    if (!sub) throw notFound('Subscription');
    return this.view(sub);
  }

  async create(body: SubscriptionBody, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const plan = await this.checkPlan(tx, body);
      const number = await nextNumber(tx, 'SUB', body.startDate.slice(0, 4));
      const sub = await tx.subscription.create({
        data: {
          number,
          customerId: body.customerId,
          planId: body.planId,
          paymentTermId: body.paymentTermId,
          startDate: toDate(body.startDate),
          expiryDate: body.expiryDate ? toDate(body.expiryDate) : null,
          notes: body.notes ?? null,
          lines: { create: this.lines(body.lines, plan) },
        },
      });
      await this.audit(tx, sub.id, actorId, 'created', null, 'DRAFT');
      return this.get(sub.id, tx);
    });
  }

  /** Editing is allowed in DRAFT/QUOTATION; lines are replaced and the plan-fee line re-synced. */
  async update(id: string, body: Partial<SubscriptionBody>, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.subscription.findUnique({ where: { id } });
      if (!current) throw notFound('Subscription');
      if (!EDITABLE.includes(current.status)) {
        throw new DomainError(
          'INVALID_TRANSITION',
          'Only draft or quotation subscriptions can be edited',
          409,
        );
      }
      const merged = {
        customerId: body.customerId ?? current.customerId,
        planId: body.planId ?? current.planId,
        paymentTermId: body.paymentTermId ?? current.paymentTermId,
        lines: body.lines,
      };
      const plan = await this.checkPlan(
        tx,
        { ...merged, lines: body.lines ?? [] },
        !body.lines,
      );
      await tx.subscription.update({
        where: { id },
        data: {
          customerId: merged.customerId,
          planId: merged.planId,
          paymentTermId: merged.paymentTermId,
          ...(body.startDate ? { startDate: toDate(body.startDate) } : {}),
          ...(body.expiryDate !== undefined
            ? { expiryDate: body.expiryDate ? toDate(body.expiryDate) : null }
            : {}),
          ...(body.notes !== undefined ? { notes: body.notes } : {}),
        },
      });
      if (body.lines) {
        await tx.subscriptionLine.deleteMany({ where: { subscriptionId: id } });
        await tx.subscription.update({
          where: { id },
          data: { lines: { create: this.lines(body.lines, plan) } },
        });
      }
      await this.audit(
        tx,
        id,
        actorId,
        'updated',
        current.status,
        current.status,
      );
      return this.get(id, tx);
    });
  }

  async history(id: string) {
    const rows = await this.prisma.auditLog.findMany({
      where: { entityType: 'Subscription', entityId: id },
      orderBy: { createdAt: 'desc' },
    });
    const actors = await this.prisma.user.findMany({
      where: {
        id: { in: rows.flatMap((r) => (r.actorId ? [r.actorId] : [])) },
      },
      select: { id: true, name: true },
    });
    const name = new Map(actors.map((a) => [a.id, a.name]));
    return rows.map((r) => ({
      ...r,
      actor: r.actorId ? (name.get(r.actorId) ?? 'User') : 'System',
    }));
  }

  /** SUB-03 via the shared machine, with a row lock on the subscription. */
  async transition(
    id: string,
    action: SubscriptionAction,
    actorId: string | null,
    reason?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Subscription" WHERE id = ${id}::uuid FOR UPDATE`;
      const sub = await tx.subscription.findUnique({
        where: { id },
        include: { plan: true, renewal: { select: { id: true } } },
      });
      if (!sub) throw notFound('Subscription');
      const check = canTransition(sub.status, action, sub.plan, {
        renewed: !!sub.renewal,
      });
      if (!check.ok) {
        throw new DomainError(
          check.code,
          `Cannot ${action} a ${sub.status.toLowerCase()} subscription`,
          check.code === 'INVALID_TRANSITION' ? 409 : 422,
        );
      }
      const settings = await readSettings(tx);
      const today = todayInTz(settings.timezone);
      if (action === 'renew') return this.renew(tx, sub, actorId, today);

      const data: Prisma.SubscriptionUpdateInput = {};
      if (action === 'send') {
        data.status = 'QUOTATION';
        data.quotationExpiresAt = toDate(
          addPeriods(
            today,
            'DAILY',
            settings.defaultQuotationValidityDays ?? 30,
          ),
        );
      } else if (action === 'revert') data.status = 'DRAFT';
      else if (action === 'confirm')
        Object.assign(data, { status: 'CONFIRMED', confirmedAt: new Date() });
      else if (action === 'activate')
        Object.assign(data, { status: 'ACTIVE', activatedAt: new Date() });
      else if (action === 'pause')
        Object.assign(data, { status: 'PAUSED', pausedAt: new Date() });
      else if (action === 'resume')
        Object.assign(data, { status: 'ACTIVE', pausedAt: null });
      else
        Object.assign(data, {
          status: 'CLOSED',
          closedAt: new Date(),
          closeReason: reason ?? action,
        });

      await tx.subscription.update({ where: { id }, data });
      await this.audit(
        tx,
        id,
        actorId,
        `transition:${action}`,
        sub.status,
        data.status as string,
        reason,
      );
      if (action === 'activate') await this.billDue(tx, id, actorId, today);
      return this.get(id, tx);
    });
  }

  /** Bills every period whose start is ≤ today (first invoice on activation, catch-up later). */
  async billDue(
    tx: Prisma.TransactionClient,
    id: string,
    actorId: string | null,
    today: string,
  ): Promise<number> {
    const sub = await tx.subscription.findUniqueOrThrow({
      where: { id },
      include: { plan: true },
    });
    if (sub.status !== 'ACTIVE') return 0;
    const start = toIso(sub.startDate);
    let n = sub.billingCycleIndex;
    let created = 0;
    for (;;) {
      const from = periodStart(start, sub.plan.billingPeriod, n);
      if (from > today || (sub.expiryDate && from >= toIso(sub.expiryDate)))
        break;
      if (await createInvoiceForPeriod(tx, id, n, actorId)) created += 1;
      n += 1;
    }
    await tx.subscription.update({
      where: { id },
      data: {
        billingCycleIndex: n,
        nextBillingDate: toDate(periodStart(start, sub.plan.billingPeriod, n)),
      },
    });
    return created;
  }

  private async renew(
    tx: Prisma.TransactionClient,
    sub: Prisma.SubscriptionGetPayload<{ include: { plan: true } }>,
    actorId: string | null,
    today: string,
  ) {
    const lines = await tx.subscriptionLine.findMany({
      where: { subscriptionId: sub.id },
      include: { taxes: true },
    });
    const startDate = sub.expiryDate ? toIso(sub.expiryDate) : today;
    const renewal = await tx.subscription.create({
      data: {
        number: await nextNumber(tx, 'SUB', startDate.slice(0, 4)),
        customerId: sub.customerId,
        planId: sub.planId,
        paymentTermId: sub.paymentTermId,
        startDate: toDate(startDate),
        parentId: sub.id,
        notes: sub.notes,
        lines: {
          create: lines.map((l) => ({
            variantId: l.variantId,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            isPlanFee: l.isPlanFee,
            sequence: l.sequence,
            taxes: { connect: l.taxes.map((t) => ({ id: t.id })) },
          })),
        },
      },
    });
    await this.audit(
      tx,
      sub.id,
      actorId,
      'transition:renew',
      sub.status,
      sub.status,
      renewal.number,
    );
    await this.audit(
      tx,
      renewal.id,
      actorId,
      'created',
      null,
      'DRAFT',
      `Renewal of ${sub.number}`,
    );
    return this.get(renewal.id, tx);
  }

  private async checkPlan(
    tx: Prisma.TransactionClient,
    body: Pick<
      SubscriptionBody,
      'customerId' | 'planId' | 'paymentTermId' | 'lines'
    >,
    skipLines = false,
  ) {
    const [customer, plan, term] = await Promise.all([
      tx.customer.count({ where: { id: body.customerId } }),
      tx.plan.findUnique({ where: { id: body.planId } }),
      tx.paymentTerm.count({ where: { id: body.paymentTermId } }),
    ]);
    if (!customer) throw notFound('Customer');
    if (!plan || !plan.isActive)
      throw new DomainError(
        'PLAN_UNAVAILABLE',
        'This plan is not available',
        422,
      );
    if (!term) throw notFound('Payment term');
    if (!skipLines) {
      const short = body.lines.find(
        (l) => !l.isPlanFee && l.quantity < plan.minQuantity,
      );
      if (short) {
        throw new DomainError(
          'BELOW_MIN_QUANTITY',
          `Each line needs at least ${plan.minQuantity} units on this plan`,
          422,
        );
      }
    }
    return plan;
  }

  /** Product lines plus one locked plan-fee line (D-002) when the plan price is above zero. */
  private lines(
    lines: SubscriptionBody['lines'],
    plan: { name: string; price: Prisma.Decimal; billingPeriod: string },
  ) {
    const product = lines.filter((l) => !l.isPlanFee);
    const result: Prisma.SubscriptionLineCreateWithoutSubscriptionInput[] =
      product.map((l, i) => ({
        ...(l.variantId ? { variant: { connect: { id: l.variantId } } } : {}),
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        sequence: i + 1,
        taxes: { connect: l.taxIds.map((id) => ({ id })) },
      }));
    if (plan.price.greaterThan(0)) {
      result.unshift({
        description: `${plan.name} — ${plan.billingPeriod.toLowerCase()} plan fee`,
        quantity: 1,
        unitPrice: plan.price,
        isPlanFee: true,
        sequence: 0,
      });
    }
    return result;
  }

  private audit(
    tx: Prisma.TransactionClient,
    entityId: string,
    actorId: string | null,
    action: string,
    fromStatus: string | null,
    toStatus: string | null,
    note?: string,
  ) {
    return tx.auditLog.create({
      data: {
        actorId,
        entityType: 'Subscription',
        entityId,
        action,
        fromStatus,
        toStatus,
        ...(note ? { meta: { note } } : {}),
      },
    });
  }

  private view(sub: Detail) {
    const lines = sub.lines.map((l) => ({
      id: l.id,
      variantId: l.variantId,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice.toFixed(2),
      isPlanFee: l.isPlanFee,
      taxIds: l.taxes.map((t) => t.id),
      taxes: l.taxes.map((t) => ({ ...t, rate: t.rate.toFixed(2) })),
    }));
    const pricing = priceDocument(lines);
    return {
      id: sub.id,
      number: sub.number,
      status: sub.status,
      customerId: sub.customerId,
      customer: sub.customer.user.name,
      customerEmail: sub.customer.user.email,
      planId: sub.planId,
      plan: sub.plan.name,
      planFlags: {
        pausable: sub.plan.pausable,
        closable: sub.plan.closable,
        renewable: sub.plan.renewable,
        autoClose: sub.plan.autoClose,
      },
      billingPeriod: sub.plan.billingPeriod,
      paymentTermId: sub.paymentTermId,
      paymentTerm: sub.paymentTerm.name,
      startDate: toIso(sub.startDate),
      expiryDate: sub.expiryDate && toIso(sub.expiryDate),
      nextBillingDate: sub.nextBillingDate && toIso(sub.nextBillingDate),
      quotationExpiresAt:
        sub.quotationExpiresAt && toIso(sub.quotationExpiresAt),
      parentId: sub.parentId,
      renewal: sub.renewal,
      notes: sub.notes,
      lines: lines.map((l, i) => ({ ...l, ...pricing.lines[i] })),
      subtotal: pricing.subtotal,
      discountTotal: pricing.discountTotal,
      taxTotal: pricing.taxTotal,
      total: pricing.total,
      discounts: sub.discounts.map((d) => ({
        id: d.discountId,
        name: d.discount.name,
      })),
      allowedActions: allowedActions(sub.status, sub.plan, {
        renewed: !!sub.renewal,
      }),
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    };
  }
}
