import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import type {
  CreateProductDto,
  ProductListQueryDto,
  UpdateProductDto,
} from '@brightloop/shared';
import { DomainError } from '../../common/errors/domain.error.js';
import {
  isRecordNotFound,
  notFound,
} from '../../common/errors/prisma-errors.js';
import {
  type PaginatedResult,
  paginate,
} from '../../common/pagination/pagination.helper.js';
import { pageArgs, parseSort } from '../../common/pagination/page.js';
import {
  type ProductView,
  type VariantView,
  productSelect,
  toProductView,
  toVariantView,
  variantOrder,
  variantSelect,
} from './product-view.js';

export type ProductDetail = ProductView & { variants: VariantView[] };

type Db = PrismaClient | Prisma.TransactionClient;

/** CAT-04: products referenced by any document can only be archived. */
export async function assertVariantsUnused(
  db: Db,
  variantWhere: Prisma.ProductVariantWhereInput,
): Promise<void> {
  const references = await db.productVariant.count({
    where: {
      ...variantWhere,
      OR: [
        { subscriptionLines: { some: {} } },
        { templateLines: { some: {} } },
        { invoiceLines: { some: {} } },
      ],
    },
  });
  if (references > 0) {
    throw new DomainError(
      'IN_USE_ARCHIVE_INSTEAD',
      'This item is used by a subscription, template or invoice. Archive it instead.',
      409,
    );
  }
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(
    query: ProductListQueryDto,
  ): Promise<PaginatedResult<ProductView>> {
    const where: Prisma.ProductWhereInput = {
      type: query.type,
      isActive: query.isActive,
      ...(query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {}),
    };
    const [field, direction] = parseSort(
      query.sort,
      ['name', 'salesPrice', 'createdAt'] as const,
      ['name', 'asc'],
    );
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: productSelect,
        orderBy: [{ [field]: direction }, { id: 'asc' }],
        ...pageArgs(query.page, query.pageSize),
      }),
      this.prisma.product.count({ where }),
    ]);
    return paginate(rows.map(toProductView), total, query.page, query.pageSize);
  }

  async get(id: string, db: Db = this.prisma): Promise<ProductDetail> {
    const product = await db.product.findUnique({
      where: { id },
      select: {
        ...productSelect,
        variants: { select: variantSelect, orderBy: variantOrder },
      },
    });
    if (!product) throw notFound('Product');
    const { variants, ...rest } = product;
    return {
      ...toProductView(rest),
      variants: variants.map((v) => toVariantView(v, product.salesPrice)),
    };
  }

  /** Creates the product and its "Default" variant in one transaction (CAT-03). */
  async create(dto: CreateProductDto): Promise<ProductDetail> {
    const { taxIds, ...data } = dto;
    return this.prisma.$transaction(async (tx) => {
      await this.assertTaxesExist(tx, taxIds);
      const product = await tx.product.create({
        data: {
          ...data,
          taxes: { connect: taxIds.map((id) => ({ id })) },
          variants: {
            create: { name: 'Default', priceExtra: '0', isDefault: true },
          },
        },
        select: { id: true },
      });
      return this.get(product.id, tx);
    });
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDetail> {
    const { taxIds, ...data } = dto;
    return this.prisma.$transaction(async (tx) => {
      if (taxIds) await this.assertTaxesExist(tx, taxIds);
      try {
        await tx.product.update({
          where: { id },
          data: {
            ...data,
            ...(taxIds
              ? { taxes: { set: taxIds.map((t) => ({ id: t })) } }
              : {}),
          },
          select: { id: true },
        });
      } catch (error) {
        if (isRecordNotFound(error)) throw notFound('Product');
        throw error;
      }
      return this.get(id, tx);
    });
  }

  /** Deletes an unused product with its variants; in-use products must be archived. */
  async remove(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!product) throw notFound('Product');
      await assertVariantsUnused(tx, { productId: id });
      await tx.productVariant.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });
  }

  private async assertTaxesExist(db: Db, taxIds: string[]): Promise<void> {
    const unique = [...new Set(taxIds)];
    const found = await db.tax.count({
      where: { id: { in: unique }, isActive: true },
    });
    if (found !== unique.length) {
      throw new DomainError(
        'VALIDATION_ERROR',
        'One or more taxes do not exist or are archived',
        400,
        { taxIds: ['Unknown or archived tax'] },
      );
    }
  }
}
