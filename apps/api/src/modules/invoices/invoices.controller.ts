import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  INVOICE_STATUSES,
  PAYMENT_METHODS,
  type IdParamDto,
  d,
  dateStringSchema,
  idParamSchema,
  paginationQuerySchema,
  todayInTz,
  toMoneyString,
} from '@brightloop/shared';
import {
  type AuthUser,
  CurrentUser,
  Roles,
} from '../../common/auth/roles.decorator.js';
import { DomainError } from '../../common/errors/domain.error.js';
import { notFound } from '../../common/errors/prisma-errors.js';
import { paginate } from '../../common/pagination/pagination.helper.js';
import { pageArgs } from '../../common/pagination/page.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { readSettings } from '../config/config.controllers.js';
import { toDate, toIso } from '../subscriptions/numbering.js';

const idPipe = new ZodValidationPipe(idParamSchema);
export const invoiceListSchema = paginationQuerySchema.extend({
  status: z.enum(INVOICE_STATUSES).optional(),
  view: z.enum(['paid', 'outstanding', 'overdue']).optional(),
  customerId: z.uuid().optional(),
  subscriptionId: z.uuid().optional(),
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
});
const paymentSchema = z.object({
  amount: z.coerce
    .number()
    .positive()
    .transform((v) => v.toFixed(2)),
  method: z.enum(PAYMENT_METHODS).default('BANK_TRANSFER'),
  paymentDate: dateStringSchema.optional(),
  note: z.string().trim().max(300).optional(),
});

type InvoiceRow = Prisma.InvoiceGetPayload<{
  include: { customer: { include: { user: { select: { name: true } } } } };
}>;

export function invoiceView(inv: InvoiceRow, today: string) {
  const amountDue = d(inv.total.toString()).minus(inv.amountPaid.toString());
  return {
    ...inv,
    customer: inv.customer.user.name,
    invoiceDate: toIso(inv.invoiceDate),
    dueDate: toIso(inv.dueDate),
    periodStart: inv.periodStart && toIso(inv.periodStart),
    periodEnd: inv.periodEnd && toIso(inv.periodEnd),
    subtotal: inv.subtotal.toFixed(2),
    discountTotal: inv.discountTotal.toFixed(2),
    taxTotal: inv.taxTotal.toFixed(2),
    total: inv.total.toFixed(2),
    amountPaid: inv.amountPaid.toFixed(2),
    amountDue: toMoneyString(amountDue),
    // INV-06: overdue is derived, never stored (D-009).
    isOverdue: inv.status === 'CONFIRMED' && toIso(inv.dueDate) < today,
  };
}

export function invoiceWhere(
  q: z.infer<typeof invoiceListSchema>,
  today: string,
): Prisma.InvoiceWhereInput {
  const view: Prisma.InvoiceWhereInput =
    q.view === 'paid'
      ? { status: 'PAID' }
      : q.view === 'outstanding'
        ? { status: 'CONFIRMED' }
        : q.view === 'overdue'
          ? { status: 'CONFIRMED', dueDate: { lt: toDate(today) } }
          : {};
  return {
    ...view,
    ...(q.status ? { status: q.status } : {}),
    customerId: q.customerId,
    subscriptionId: q.subscriptionId,
    invoiceDate: {
      gte: q.from ? toDate(q.from) : undefined,
      lte: q.to ? toDate(q.to) : undefined,
    },
    ...(q.q
      ? {
          OR: [
            { number: { contains: q.q, mode: 'insensitive' } },
            {
              customer: {
                user: { name: { contains: q.q, mode: 'insensitive' } },
              },
            },
          ],
        }
      : {}),
  };
}

const include = {
  customer: { include: { user: { select: { name: true } } } },
} as const;

@Roles('ADMIN', 'STAFF')
@Controller()
export class InvoicesController {
  constructor(private readonly prisma: PrismaClient) {}

  private async today() {
    return todayInTz((await readSettings(this.prisma)).timezone);
  }

  @Get('invoices')
  async list(
    @Query(new ZodValidationPipe(invoiceListSchema))
    q: z.infer<typeof invoiceListSchema>,
  ) {
    const today = await this.today();
    const where = invoiceWhere(q, today);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        include,
        orderBy: [{ invoiceDate: 'desc' }, { number: 'desc' }],
        ...pageArgs(q.page, q.pageSize),
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return paginate(
      rows.map((r) => invoiceView(r, today)),
      total,
      q.page,
      q.pageSize,
    );
  }

  @Get('invoices/:id')
  async get(@Param(idPipe) { id }: IdParamDto) {
    const inv = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        ...include,
        subscription: { select: { id: true, number: true } },
        lines: { orderBy: { sequence: 'asc' } },
        payments: {
          orderBy: { paymentDate: 'asc' },
          include: { recordedBy: { select: { name: true } } },
        },
      },
    });
    if (!inv) throw notFound('Invoice');
    return {
      ...invoiceView(inv, await this.today()),
      lines: inv.lines.map((l) => ({
        ...l,
        unitPrice: l.unitPrice.toFixed(2),
        subtotal: l.subtotal.toFixed(2),
        discountAmount: l.discountAmount.toFixed(2),
        taxAmount: l.taxAmount.toFixed(2),
        total: l.total.toFixed(2),
      })),
      payments: inv.payments.map((p) => ({
        ...p,
        amount: p.amount.toFixed(2),
        paymentDate: toIso(p.paymentDate),
        recordedBy: p.recordedBy.name,
      })),
    };
  }

  @Post('invoices/:id/confirm')
  @HttpCode(200)
  async confirm(
    @Param(idPipe) { id }: IdParamDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.setStatus(
      [id],
      'DRAFT',
      { status: 'CONFIRMED', confirmedAt: new Date() },
      user,
      'confirm',
    );
    return this.get({ id });
  }

  @Post('invoices/confirm-bulk')
  @HttpCode(200)
  async confirmBulk(
    @Body(
      new ZodValidationPipe(
        z.object({ ids: z.array(z.uuid()).min(1).max(100) }),
      ),
    )
    body: { ids: string[] },
    @CurrentUser() user: AuthUser,
  ) {
    const confirmed = await this.setStatus(
      body.ids,
      'DRAFT',
      { status: 'CONFIRMED', confirmedAt: new Date() },
      user,
      'confirm',
    );
    return { confirmed };
  }

  @Post('invoices/:id/cancel')
  @HttpCode(200)
  async cancel(
    @Param(idPipe) { id }: IdParamDto,
    @Body(
      new ZodValidationPipe(
        z.object({ reason: z.string().trim().max(500).optional() }).default({}),
      ),
    )
    body: { reason?: string },
    @CurrentUser() user: AuthUser,
  ) {
    const inv = await this.prisma.invoice.findUnique({
      where: { id },
      select: { amountPaid: true, status: true },
    });
    if (!inv) throw notFound('Invoice');
    if (inv.amountPaid.greaterThan(0)) {
      throw new DomainError(
        'INVOICE_HAS_PAYMENTS',
        'Delete the payments before cancelling this invoice',
        409,
      );
    }
    if (!['DRAFT', 'CONFIRMED'].includes(inv.status)) {
      throw new DomainError(
        'INVALID_TRANSITION',
        'Only draft or confirmed invoices can be cancelled',
        409,
      );
    }
    await this.setStatus(
      [id],
      inv.status,
      {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: body.reason ?? null,
      },
      user,
      'cancel',
    );
    return this.get({ id });
  }

  @Post('invoices/:id/send')
  @HttpCode(200)
  async send(@Param(idPipe) { id }: IdParamDto) {
    await this.prisma.invoice.update({
      where: { id },
      data: { sentAt: new Date() },
    });
    return this.get({ id });
  }

  /** PAY-01..03: row-locked; amount ≤ due; date ≤ today; auto PAID when settled. */
  @Post('invoices/:id/payments')
  async pay(
    @Param(idPipe) { id }: IdParamDto,
    @Body(new ZodValidationPipe(paymentSchema))
    body: z.infer<typeof paymentSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    const today = await this.today();
    const paymentDate = body.paymentDate ?? today;
    if (paymentDate > today) {
      throw new DomainError(
        'VALIDATION_ERROR',
        'Payment date cannot be in the future',
        400,
        { paymentDate: ['Must be today or earlier'] },
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${id}::uuid FOR UPDATE`;
      const inv = await tx.invoice.findUnique({ where: { id } });
      if (!inv) throw notFound('Invoice');
      if (inv.status !== 'CONFIRMED')
        throw new DomainError(
          'INVOICE_NOT_PAYABLE',
          'Only confirmed invoices can be paid',
          422,
        );
      const due = d(inv.total.toString()).minus(inv.amountPaid.toString());
      if (d(body.amount).greaterThan(due)) {
        throw new DomainError(
          'PAYMENT_EXCEEDS_DUE',
          `Amount exceeds the ${due.toFixed(2)} due`,
          422,
        );
      }
      const paid = d(inv.amountPaid.toString()).plus(body.amount);
      const settled = paid.greaterThanOrEqualTo(inv.total.toString());
      const payment = await tx.payment.create({
        data: {
          invoiceId: id,
          amount: body.amount,
          method: body.method,
          paymentDate: toDate(paymentDate),
          note: body.note ?? null,
          recordedById: user.sub,
        },
      });
      await tx.invoice.update({
        where: { id },
        data: {
          amountPaid: paid.toFixed(2),
          ...(settled ? { status: 'PAID', paidAt: new Date() } : {}),
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.sub,
          actorRole: user.role,
          entityType: 'Invoice',
          entityId: id,
          action: 'payment:recorded',
          fromStatus: inv.status,
          toStatus: settled ? 'PAID' : inv.status,
          meta: { paymentId: payment.id, amount: body.amount },
        },
      });
    });
    return this.get({ id });
  }

  @Get('payments')
  async payments(
    @Query(new ZodValidationPipe(paginationQuerySchema))
    q: z.infer<typeof paginationQuerySchema>,
  ) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        include: {
          invoice: {
            select: {
              number: true,
              customer: { select: { user: { select: { name: true } } } },
            },
          },
        },
        orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
        ...pageArgs(q.page, q.pageSize),
      }),
      this.prisma.payment.count(),
    ]);
    return paginate(
      rows.map((p) => ({
        ...p,
        amount: p.amount.toFixed(2),
        paymentDate: toIso(p.paymentDate),
        invoiceNumber: p.invoice.number,
        customer: p.invoice.customer.user.name,
      })),
      total,
      q.page,
      q.pageSize,
    );
  }

  @Roles('ADMIN')
  @Delete('payments/:id')
  @HttpCode(204)
  async deletePayment(
    @Param(idPipe) { id }: IdParamDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id } });
      if (!payment) throw notFound('Payment');
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${payment.invoiceId}::uuid FOR UPDATE`;
      const inv = await tx.invoice.findUniqueOrThrow({
        where: { id: payment.invoiceId },
      });
      await tx.payment.delete({ where: { id } });
      await tx.invoice.update({
        where: { id: inv.id },
        data: {
          amountPaid: d(inv.amountPaid.toString())
            .minus(payment.amount.toString())
            .toFixed(2),
          status: inv.status === 'PAID' ? 'CONFIRMED' : inv.status,
          paidAt: null,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.sub,
          actorRole: user.role,
          entityType: 'Invoice',
          entityId: inv.id,
          action: 'payment:deleted',
          meta: { paymentId: id, amount: payment.amount.toFixed(2) },
        },
      });
    });
  }

  private async setStatus(
    ids: string[],
    from: string,
    data: Prisma.InvoiceUpdateManyMutationInput,
    user: AuthUser,
    action: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.invoice.findMany({
        where: { id: { in: ids }, status: from as never },
        select: { id: true },
      });
      if (!rows.length)
        throw new DomainError(
          'INVALID_TRANSITION',
          `Invoice cannot ${action} from its current status`,
          409,
        );
      await tx.invoice.updateMany({
        where: { id: { in: rows.map((r) => r.id) } },
        data,
      });
      await tx.auditLog.createMany({
        data: rows.map((r) => ({
          actorId: user.sub,
          actorRole: user.role,
          entityType: 'Invoice',
          entityId: r.id,
          action: `invoice:${action}`,
          fromStatus: from,
          toStatus: String(data.status),
        })),
      });
      return rows.length;
    });
  }
}
