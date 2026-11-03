import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  dateStringSchema,
  paginationQuerySchema,
} from '@brightloop/shared';
import { DomainError } from '../../common/errors/domain.error.js';
import {
  isUniqueViolation,
  notFound,
} from '../../common/errors/prisma-errors.js';
import { paginate } from '../../common/pagination/pagination.helper.js';
import { pageArgs, parseSort } from '../../common/pagination/page.js';

export const discountQuerySchema = paginationQuerySchema.extend({
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  type: z.enum(['FIXED', 'PERCENTAGE']).optional(),
  scope: z.enum(['PRODUCTS', 'SUBSCRIPTION']).optional(),
});

export const createDiscountSchema = z.object({
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().max(50).optional(),
  type: z.enum(['FIXED', 'PERCENTAGE']),
  value: z.coerce.number().positive().transform((v) => v.toFixed(2)),
  scope: z.enum(['PRODUCTS', 'SUBSCRIPTION']),
  minPurchase: z.coerce.number().nonnegative().transform((v) => v.toFixed(2)).optional(),
  minQuantity: z.coerce.number().int().positive().optional(),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  usageLimit: z.coerce.number().int().positive().optional(),
  isActive: z.boolean().default(true),
  productIds: z.array(z.string().uuid()).default([]),
});

export const updateDiscountSchema = createDiscountSchema.partial();

const toDate = (v: string) => new Date(`${v}T00:00:00.000Z`);
const toIso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

function toView(dRow: Prisma.DiscountGetPayload<{ include: { products: { select: { id: true; name: true } } } }>) {
  return {
    ...dRow,
    value: dRow.value.toFixed(2),
    minPurchase: dRow.minPurchase ? dRow.minPurchase.toFixed(2) : null,
    startDate: toIso(dRow.startDate)!,
    endDate: toIso(dRow.endDate)!,
  };
}

@Injectable()
export class DiscountsService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: z.infer<typeof discountQuerySchema>) {
    const where: Prisma.DiscountWhereInput = {
      isActive: query.isActive,
      type: query.type,
      scope: query.scope,
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { code: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [field, direction] = parseSort(
      query.sort,
      ['name', 'createdAt', 'startDate', 'endDate'] as const,
      ['createdAt', 'desc'],
    );

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.discount.findMany({
        where,
        include: { products: { select: { id: true, name: true } } },
        orderBy: [{ [field]: direction }, { id: 'asc' }],
        ...pageArgs(query.page, query.pageSize),
      }),
      this.prisma.discount.count({ where }),
    ]);

    return paginate(rows.map(toView), total, query.page, query.pageSize);
  }

  async get(id: string) {
    const row = await this.prisma.discount.findUnique({
      where: { id },
      include: { products: { select: { id: true, name: true } } },
    });
    if (!row) throw notFound('Discount');
    return toView(row);
  }

  async create(body: z.infer<typeof createDiscountSchema>) {
    const { productIds, startDate, endDate, ...rest } = body;
    if (startDate > endDate) {
      throw new DomainError('INVALID_DATES', 'Start date must be before or equal to end date', 400);
    }
    try {
      const row = await this.prisma.discount.create({
        data: {
          ...rest,
          startDate: toDate(startDate),
          endDate: toDate(endDate),
          products: productIds?.length
            ? { connect: productIds.map((id) => ({ id })) }
            : undefined,
        },
        include: { products: { select: { id: true, name: true } } },
      });
      return toView(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DomainError('CODE_TAKEN', 'Discount code already exists', 409);
      }
      throw error;
    }
  }

  async update(id: string, body: z.infer<typeof updateDiscountSchema>) {
    const { productIds, startDate, endDate, ...rest } = body;
    const existing = await this.prisma.discount.findUnique({ where: { id } });
    if (!existing) throw notFound('Discount');

    const sDate = startDate ? toDate(startDate) : existing.startDate;
    const eDate = endDate ? toDate(endDate) : existing.endDate;
    if (sDate > eDate) {
      throw new DomainError('INVALID_DATES', 'Start date must be before or equal to end date', 400);
    }

    try {
      const row = await this.prisma.discount.update({
        where: { id },
        data: {
          ...rest,
          ...(startDate ? { startDate: toDate(startDate) } : {}),
          ...(endDate ? { endDate: toDate(endDate) } : {}),
          ...(productIds !== undefined
            ? { products: { set: productIds.map((pid) => ({ id: pid })) } }
            : {}),
        },
        include: { products: { select: { id: true, name: true } } },
      });
      return toView(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DomainError('CODE_TAKEN', 'Discount code already exists', 409);
      }
      throw error;
    }
  }
}
