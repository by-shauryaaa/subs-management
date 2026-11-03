import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { d, paginationQuerySchema, toMoneyString } from '@brightloop/shared';
import { DomainError } from '../../common/errors/domain.error.js';
import { notFound } from '../../common/errors/prisma-errors.js';
import { paginate } from '../../common/pagination/pagination.helper.js';
import { pageArgs } from '../../common/pagination/page.js';
import { InvoicePdfService } from '../../common/pdf/invoice-pdf.service.js';
import { readSettings } from '../config/config.controllers.js';
import { InvoicesController } from '../invoices/invoices.controller.js';
import { toIso } from '../subscriptions/numbering.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(50).optional().nullable(),
  companyName: z.string().trim().max(100).optional().nullable(),
  billingAddress: z.string().trim().max(300).optional().nullable(),
  taxId: z.string().trim().max(50).optional().nullable(),
});

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly subscriptions: SubscriptionsService,
    private readonly invoices: InvoicesController,
    private readonly pdfService: InvoicePdfService,
  ) {}

  async getCustomerId(userId: string, tokenCustomerId?: string | null): Promise<string> {
    if (tokenCustomerId) return tokenCustomerId;
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!customer) {
      throw new DomainError('CUSTOMER_NOT_FOUND', 'Customer profile not found for this user', 404);
    }
    return customer.id;
  }

  async home(customerId: string) {
    const activeSubscriptions = await this.prisma.subscription.count({
      where: { customerId, status: 'ACTIVE' },
    });

    const nextSub = await this.prisma.subscription.findFirst({
      where: { customerId, status: 'ACTIVE', nextBillingDate: { not: null } },
      orderBy: { nextBillingDate: 'asc' },
      select: { nextBillingDate: true },
    });

    const confirmedInvoices = await this.prisma.invoice.findMany({
      where: { customerId, status: 'CONFIRMED' },
      select: { total: true, amountPaid: true },
    });

    let dueTotal = d(0);
    for (const inv of confirmedInvoices) {
      dueTotal = dueTotal.plus(d(inv.total.toString()).minus(inv.amountPaid.toString()));
    }

    const quotations = await this.prisma.subscription.findMany({
      where: { customerId, status: 'QUOTATION' },
      select: { id: true, number: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      activeSubscriptions,
      nextBillingDate: nextSub?.nextBillingDate ? toIso(nextSub.nextBillingDate) : null,
      amountDue: toMoneyString(dueTotal),
      quotations,
    };
  }

  async listSubscriptions(customerId: string, query: z.infer<typeof paginationQuerySchema>) {
    const where = { customerId };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where,
        select: {
          id: true,
          number: true,
          status: true,
          startDate: true,
          expiryDate: true,
          nextBillingDate: true,
          plan: { select: { name: true, billingPeriod: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        ...pageArgs(query.page, query.pageSize),
      }),
      this.prisma.subscription.count({ where }),
    ]);

    const formatted = rows.map((r) => ({
      ...r,
      startDate: toIso(r.startDate),
      expiryDate: r.expiryDate && toIso(r.expiryDate),
      nextBillingDate: r.nextBillingDate && toIso(r.nextBillingDate),
    }));

    return paginate(formatted, total, query.page, query.pageSize);
  }

  async getSubscription(customerId: string, id: string) {
    const sub = await this.subscriptions.get(id);
    if (sub.customerId !== customerId) {
      throw notFound('Subscription');
    }
    return sub;
  }

  async transitionSubscription(
    customerId: string,
    id: string,
    action: string,
    userId: string,
    reason?: string,
  ) {
    const sub = await this.subscriptions.get(id);
    if (sub.customerId !== customerId) {
      throw notFound('Subscription');
    }

    // Map portal action names to internal state machine actions
    let canonicalAction = action;
    if (action === 'accept') canonicalAction = 'confirm';
    if (action === 'decline') canonicalAction = 'cancel';

    return this.subscriptions.transition(id, canonicalAction as never, userId, reason);
  }

  async listInvoices(customerId: string, query: z.infer<typeof paginationQuerySchema>) {
    return this.invoices.list({ ...query, customerId });
  }

  async getInvoice(customerId: string, id: string) {
    const inv = await this.invoices.get({ id });
    if (inv.customerId !== customerId) {
      throw notFound('Invoice');
    }
    return inv;
  }

  async getInvoicePdf(customerId: string, id: string): Promise<Buffer> {
    const inv = await this.getInvoice(customerId, id);
    const settings = await readSettings(this.prisma);
    const snap = (inv.customerSnapshot ?? {}) as Record<string, unknown>;

    return this.pdfService.generate({
      number: inv.number,
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate,
      periodStart: inv.periodStart,
      periodEnd: inv.periodEnd,
      currency: inv.currency,
      status: inv.status,
      company: {
        name: typeof settings.companyName === 'string' ? settings.companyName : 'Brightloop Software',
        address: typeof settings.companyAddress === 'string' ? settings.companyAddress : undefined,
        email: typeof settings.companyEmail === 'string' ? settings.companyEmail : undefined,
        phone: typeof settings.companyPhone === 'string' ? settings.companyPhone : undefined,
        taxId: typeof settings.companyTaxId === 'string' ? settings.companyTaxId : undefined,
      },
      customer: {
        name: typeof snap.name === 'string' ? snap.name : inv.customer,
        email: typeof snap.email === 'string' ? snap.email : '',
        companyName: typeof snap.companyName === 'string' ? snap.companyName : undefined,
        billingAddress: typeof snap.billingAddress === 'string' ? snap.billingAddress : undefined,
        taxId: typeof snap.taxId === 'string' ? snap.taxId : undefined,
      },
      lines: inv.lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        amount: l.total,
      })),
      subtotal: inv.subtotal,
      discountTotal: inv.discountTotal,
      taxTotal: inv.taxTotal,
      total: inv.total,
      amountPaid: inv.amountPaid,
      amountDue: inv.amountDue,
    });
  }

  async getProfile(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!customer) throw notFound('Customer');
    return {
      name: customer.user.name,
      email: customer.user.email,
      phone: customer.phone,
      companyName: customer.companyName,
      billingAddress: customer.billingAddress,
      taxId: customer.taxId,
    };
  }

  async updateProfile(customerId: string, body: z.infer<typeof updateProfileSchema>) {
    const { name, ...profileData } = body;
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) throw notFound('Customer');

    await this.prisma.$transaction(async (tx) => {
      if (name) {
        await tx.user.update({
          where: { id: customer.userId },
          data: { name },
        });
      }
      await tx.customer.update({
        where: { id: customerId },
        data: profileData,
      });
    });

    return this.getProfile(customerId);
  }
}
