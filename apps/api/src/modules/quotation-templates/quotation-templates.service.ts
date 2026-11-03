import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import type {
  CreateQuotationTemplateDto,
  QuotationTemplateListQueryDto,
  UpdateQuotationTemplateDto,
} from '@brightloop/shared';
import { DomainError } from '../../common/errors/domain.error.js';
import { notFound } from '../../common/errors/prisma-errors.js';
import { pageArgs, parseSort } from '../../common/pagination/page.js';
import { paginate } from '../../common/pagination/pagination.helper.js';

@Injectable()
export class QuotationTemplatesService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: QuotationTemplateListQueryDto) {
    const { skip, take } = pageArgs(query.page, query.pageSize);
    const where: Prisma.QuotationTemplateWhereInput = {
      ...(query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.planId ? { planId: query.planId } : {}),
    };

    const [sortField, sortDir] = parseSort(
      query.sort,
      ['name', 'createdAt', 'updatedAt', 'validityDays'] as const,
      ['name', 'asc'],
    );

    const [items, total] = await Promise.all([
      this.prisma.quotationTemplate.findMany({
        where,
        skip,
        take,
        orderBy: { [sortField]: sortDir },
        include: {
          plan: {
            select: { id: true, name: true, billingPeriod: true },
          },
          paymentTerm: {
            select: { id: true, name: true, dueDays: true },
          },
          _count: {
            select: { lines: true, subscriptions: true },
          },
        },
      }),
      this.prisma.quotationTemplate.count({ where }),
    ]);

    return paginate(
      items.map((t) => ({
        id: t.id,
        name: t.name,
        validityDays: t.validityDays,
        plan: t.plan,
        paymentTerm: t.paymentTerm,
        notes: t.notes,
        isActive: t.isActive,
        linesCount: t._count.lines,
        subscriptionsCount: t._count.subscriptions,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      total,
      query.page,
      query.pageSize,
    );
  }

  async get(id: string) {
    const template = await this.prisma.quotationTemplate.findUnique({
      where: { id },
      include: {
        plan: true,
        paymentTerm: true,
        lines: {
          orderBy: { sequence: 'asc' },
          include: {
            variant: {
              include: {
                product: true,
                attributeValues: {
                  include: { attributeValue: true },
                },
              },
            },
          },
        },
      },
    });

    if (!template) {
      throw notFound('QuotationTemplate');
    }

    return {
      id: template.id,
      name: template.name,
      validityDays: template.validityDays,
      planId: template.planId,
      plan: template.plan,
      paymentTermId: template.paymentTermId,
      paymentTerm: template.paymentTerm,
      notes: template.notes,
      isActive: template.isActive,
      lines: template.lines.map((l) => ({
        id: l.id,
        variantId: l.variantId,
        quantity: l.quantity,
        unitPrice: l.unitPrice ? l.unitPrice.toString() : null,
        sequence: l.sequence,
        variant: {
          id: l.variant.id,
          name: l.variant.name,
          priceExtra: l.variant.priceExtra.toString(),
          product: {
            id: l.variant.product.id,
            name: l.variant.product.name,
            salesPrice: l.variant.product.salesPrice.toString(),
          },
        },
      })),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }

  async create(body: CreateQuotationTemplateDto) {
    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.plan.findUnique({
        where: { id: body.planId },
      });
      if (!plan || !plan.isActive) {
        throw new DomainError('INVALID_PLAN', 'Plan not found or inactive', 422);
      }

      if (body.paymentTermId) {
        const pt = await tx.paymentTerm.findUnique({
          where: { id: body.paymentTermId },
        });
        if (!pt || !pt.isActive) {
          throw new DomainError('INVALID_PAYMENT_TERM', 'Payment term not found or inactive', 422);
        }
      }

      if (body.lines && body.lines.length > 0) {
        const variantIds = body.lines.map((l) => l.variantId);
        const variants = await tx.productVariant.findMany({
          where: { id: { in: variantIds }, isActive: true },
        });
        if (variants.length !== new Set(variantIds).size) {
          throw new DomainError('INVALID_VARIANT', 'One or more product variants are invalid or inactive', 422);
        }
      }

      const created = await tx.quotationTemplate.create({
        data: {
          name: body.name,
          validityDays: body.validityDays,
          planId: body.planId,
          paymentTermId: body.paymentTermId ?? null,
          notes: body.notes ?? null,
          isActive: body.isActive ?? true,
          lines: {
            create: (body.lines ?? []).map((l, idx) => ({
              variantId: l.variantId,
              quantity: l.quantity,
              unitPrice: l.unitPrice ? new Prisma.Decimal(l.unitPrice) : null,
              sequence: l.sequence ?? idx,
            })),
          },
        },
      });

      return this.get(created.id);
    });
  }

  async update(id: string, body: UpdateQuotationTemplateDto) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.quotationTemplate.findUnique({ where: { id } });
      if (!current) throw notFound('QuotationTemplate');

      if (body.planId) {
        const plan = await tx.plan.findUnique({ where: { id: body.planId } });
        if (!plan || !plan.isActive) {
          throw new DomainError('INVALID_PLAN', 'Plan not found or inactive', 422);
        }
      }

      if (body.paymentTermId) {
        const pt = await tx.paymentTerm.findUnique({ where: { id: body.paymentTermId } });
        if (!pt || !pt.isActive) {
          throw new DomainError('INVALID_PAYMENT_TERM', 'Payment term not found or inactive', 422);
        }
      }

      if (body.lines) {
        const variantIds = body.lines.map((l) => l.variantId);
        if (variantIds.length > 0) {
          const variants = await tx.productVariant.findMany({
            where: { id: { in: variantIds }, isActive: true },
          });
          if (variants.length !== new Set(variantIds).size) {
            throw new DomainError('INVALID_VARIANT', 'One or more product variants are invalid or inactive', 422);
          }
        }

        await tx.quotationTemplateLine.deleteMany({ where: { templateId: id } });
        await tx.quotationTemplateLine.createMany({
          data: body.lines.map((l, idx) => ({
            templateId: id,
            variantId: l.variantId,
            quantity: l.quantity,
            unitPrice: l.unitPrice ? new Prisma.Decimal(l.unitPrice) : null,
            sequence: l.sequence ?? idx,
          })),
        });
      }

      await tx.quotationTemplate.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.validityDays !== undefined ? { validityDays: body.validityDays } : {}),
          ...(body.planId !== undefined ? { planId: body.planId } : {}),
          ...(body.paymentTermId !== undefined ? { paymentTermId: body.paymentTermId } : {}),
          ...(body.notes !== undefined ? { notes: body.notes } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
      });

      return this.get(id);
    });
  }

  async remove(id: string) {
    const subCount = await this.prisma.subscription.count({
      where: { quotationTemplateId: id },
    });

    if (subCount > 0) {
      await this.prisma.quotationTemplate.update({
        where: { id },
        data: { isActive: false },
      });
      return { success: true, archived: true };
    }

    await this.prisma.quotationTemplate.delete({ where: { id } });
    return { success: true, deleted: true };
  }
}
