import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  type CreateVariantDto,
  type UpdateVariantDto,
  type VariantPickerQueryDto,
  d,
  sum,
  toMoneyString,
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
import { pageArgs } from '../../common/pagination/page.js';
import {
  type TaxRef,
  type VariantView,
  taxSelect,
  toTaxRef,
  toVariantView,
  variantOrder,
  variantSelect,
} from './product-view.js';
import { assertVariantsUnused } from './products.service.js';

/** Row for the line-item picker (`GET /variants?q=`). */
export interface VariantPickerItem {
  id: string;
  productId: string;
  productName: string;
  name: string;
  /** "Product" for the default variant, else "Product (Variant)". */
  label: string;
  isDefault: boolean;
  priceExtra: string;
  price: string;
  taxes: TaxRef[];
}

const invalid = (message: string, details: Record<string, unknown>) =>
  new DomainError('VALIDATION_ERROR', message, 400, details);

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaClient) {}

  async listForProduct(productId: string): Promise<VariantView[]> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        salesPrice: true,
        variants: { select: variantSelect, orderBy: variantOrder },
      },
    });
    if (!product) throw notFound('Product');
    return product.variants.map((v) => toVariantView(v, product.salesPrice));
  }

  /**
   * CAT-03: one value per attribute; the price extra defaults to the sum of
   * the values' extras and the name to their names (by attribute name).
   */
  async create(productId: string, dto: CreateVariantDto): Promise<VariantView> {
    const valueIds = [...new Set(dto.attributeValueIds)];
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { salesPrice: true },
      });
      if (!product) throw notFound('Product');
      const values = await tx.attributeValue.findMany({
        where: { id: { in: valueIds } },
        select: {
          id: true,
          name: true,
          priceExtra: true,
          attributeId: true,
          attribute: { select: { name: true } },
        },
      });
      if (values.length !== valueIds.length) {
        throw invalid('Unknown attribute value', {
          attributeValueIds: ['Unknown attribute value'],
        });
      }
      if (new Set(values.map((v) => v.attributeId)).size !== values.length) {
        throw invalid('Pick at most one value per attribute', {
          attributeValueIds: ['Pick at most one value per attribute'],
        });
      }
      await this.assertCombinationIsNew(tx, productId, valueIds);
      values.sort((a, b) => a.attribute.name.localeCompare(b.attribute.name));
      const variant = await tx.productVariant.create({
        data: {
          productId,
          name: dto.name ?? values.map((v) => v.name).join(' / '),
          priceExtra:
            dto.priceExtra ??
            toMoneyString(sum(values.map((v) => v.priceExtra.toString()))),
          attributeValues: {
            create: values.map((v) => ({ attributeValueId: v.id })),
          },
        },
        select: variantSelect,
      });
      return toVariantView(variant, product.salesPrice);
    });
  }

  async update(id: string, dto: UpdateVariantDto): Promise<VariantView> {
    const existing = await this.prisma.productVariant.findUnique({
      where: { id },
      select: { isDefault: true },
    });
    if (!existing) throw notFound('Variant');
    if (existing.isDefault && dto.isActive === false) {
      throw invalid('Archive the product instead of its default variant', {
        isActive: ['The default variant follows its product'],
      });
    }
    try {
      const variant = await this.prisma.productVariant.update({
        where: { id },
        data: dto,
        select: { ...variantSelect, product: { select: { salesPrice: true } } },
      });
      const { product, ...rest } = variant;
      return toVariantView(rest, product.salesPrice);
    } catch (error) {
      if (isRecordNotFound(error)) throw notFound('Variant');
      throw error;
    }
  }

  /** Deletes an unused, non-default variant (CAT-04). */
  async remove(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id },
        select: { isDefault: true },
      });
      if (!variant) throw notFound('Variant');
      if (variant.isDefault) {
        throw invalid('The default variant cannot be deleted', {
          id: ['The default variant is removed with its product'],
        });
      }
      await assertVariantsUnused(tx, { id });
      await tx.productVariant.delete({ where: { id } });
    });
  }

  /** Active variants of active products; `q` matches product or variant name. */
  async picker(
    query: VariantPickerQueryDto,
  ): Promise<PaginatedResult<VariantPickerItem>> {
    const where: Prisma.ProductVariantWhereInput = {
      isActive: true,
      product: { isActive: true },
      productId: query.productId,
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { product: { name: { contains: query.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.productVariant.findMany({
        where,
        select: {
          id: true,
          productId: true,
          name: true,
          isDefault: true,
          priceExtra: true,
          product: {
            select: {
              name: true,
              salesPrice: true,
              taxes: { select: taxSelect, orderBy: { rate: 'asc' } },
            },
          },
        },
        orderBy: [{ product: { name: 'asc' } }, ...variantOrder, { id: 'asc' }],
        ...pageArgs(query.page, query.pageSize),
      }),
      this.prisma.productVariant.count({ where }),
    ]);
    return paginate(
      rows.map(({ product, ...variant }) => ({
        ...variant,
        productName: product.name,
        label: variant.isDefault
          ? product.name
          : `${product.name} (${variant.name})`,
        priceExtra: variant.priceExtra.toFixed(2),
        price: toMoneyString(
          d(product.salesPrice.toString()).plus(variant.priceExtra.toString()),
        ),
        taxes: product.taxes.map(toTaxRef),
      })),
      total,
      query.page,
      query.pageSize,
    );
  }

  private async assertCombinationIsNew(
    tx: Prisma.TransactionClient,
    productId: string,
    valueIds: string[],
  ): Promise<void> {
    const wanted = [...valueIds].sort().join(',');
    const siblings = await tx.productVariant.findMany({
      where: { productId },
      select: { attributeValues: { select: { attributeValueId: true } } },
    });
    const duplicate = siblings.some(
      (s) =>
        s.attributeValues
          .map((v) => v.attributeValueId)
          .sort()
          .join(',') === wanted,
    );
    if (duplicate) {
      throw new DomainError(
        'VARIANT_EXISTS',
        'A variant with these attribute values already exists',
        409,
      );
    }
  }
}
