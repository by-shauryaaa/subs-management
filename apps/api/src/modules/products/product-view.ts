import { Prisma } from '@prisma/client';
import { d, toMoneyString } from '@brightloop/shared';

export const taxSelect = {
  id: true,
  name: true,
  rate: true,
} satisfies Prisma.TaxSelect;

export interface TaxRef {
  id: string;
  name: string;
  /** Percent, e.g. "18.00". */
  rate: string;
}

export function toTaxRef(
  tax: Prisma.TaxGetPayload<{ select: typeof taxSelect }>,
): TaxRef {
  return { ...tax, rate: tax.rate.toFixed(2) };
}

export const productSelect = {
  id: true,
  name: true,
  type: true,
  salesPrice: true,
  costPrice: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  taxes: { select: taxSelect, orderBy: { rate: 'asc' } },
  _count: { select: { variants: true } },
} satisfies Prisma.ProductSelect;

type ProductRecord = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

export interface ProductView {
  id: string;
  name: string;
  type: ProductRecord['type'];
  salesPrice: string;
  costPrice: string;
  notes: string | null;
  isActive: boolean;
  /** Default taxes copied onto new subscription lines. */
  taxes: TaxRef[];
  variantCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export function toProductView({
  _count,
  ...product
}: ProductRecord): ProductView {
  return {
    ...product,
    salesPrice: product.salesPrice.toFixed(2),
    costPrice: product.costPrice.toFixed(2),
    taxes: product.taxes.map(toTaxRef),
    variantCount: _count.variants,
  };
}

export const variantSelect = {
  id: true,
  productId: true,
  name: true,
  priceExtra: true,
  isDefault: true,
  isActive: true,
  attributeValues: {
    select: {
      attributeValue: {
        select: { id: true, name: true, attribute: { select: { name: true } } },
      },
    },
  },
} satisfies Prisma.ProductVariantSelect;

type VariantRecord = Prisma.ProductVariantGetPayload<{
  select: typeof variantSelect;
}>;

export interface VariantView {
  id: string;
  productId: string;
  name: string;
  priceExtra: string;
  /** CAT-03: product sales price + variant price extra. */
  price: string;
  isDefault: boolean;
  isActive: boolean;
  attributeValues: { id: string; attributeName: string; name: string }[];
}

export function toVariantView(
  { attributeValues, ...variant }: VariantRecord,
  salesPrice: Prisma.Decimal,
): VariantView {
  return {
    ...variant,
    priceExtra: variant.priceExtra.toFixed(2),
    price: toMoneyString(
      d(salesPrice.toString()).plus(variant.priceExtra.toString()),
    ),
    attributeValues: attributeValues
      .map(({ attributeValue: value }) => ({
        id: value.id,
        attributeName: value.attribute.name,
        name: value.name,
      }))
      .sort((a, b) => a.attributeName.localeCompare(b.attributeName)),
  };
}

/** Default variant first, then by name. */
export const variantOrder: Prisma.ProductVariantOrderByWithRelationInput[] = [
  { isDefault: 'desc' },
  { name: 'asc' },
];
