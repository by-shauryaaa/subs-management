import { z } from 'zod';
import { PRODUCT_TYPES } from '../enums.js';
import { moneyStringSchema, paginationQuerySchema } from './common.js';
import { optionalTextSchema } from './customers.js';
import { booleanQuerySchema } from './users.js';

/** Money string that must be ≥ 0 (prices, price extras). */
export const nonNegativeMoneySchema = moneyStringSchema.refine(
  (value) => !value.startsWith('-'),
  { message: 'Amount must be zero or more' },
);

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(160),
  type: z.enum(PRODUCT_TYPES),
  salesPrice: nonNegativeMoneySchema,
  costPrice: nonNegativeMoneySchema,
  notes: optionalTextSchema(2000),
  taxIds: z.array(z.uuid()).max(10).default([]),
  isActive: z.boolean().default(true),
});
export type CreateProductDto = z.infer<typeof createProductSchema>;

/** `PATCH /products/:id`. `taxIds`, when sent, replaces the default taxes. */
export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    type: z.enum(PRODUCT_TYPES),
    salesPrice: nonNegativeMoneySchema,
    costPrice: nonNegativeMoneySchema,
    notes: optionalTextSchema(2000),
    taxIds: z.array(z.uuid()).max(10),
    isActive: z.boolean(),
  })
  .partial();
export type UpdateProductDto = z.infer<typeof updateProductSchema>;

/** `GET /products`: `q` matches the name. Sort: name, salesPrice, createdAt. */
export const productListQuerySchema = paginationQuerySchema.extend({
  type: z.enum(PRODUCT_TYPES).optional(),
  isActive: booleanQuerySchema.optional(),
});
export type ProductListQueryDto = z.infer<typeof productListQuerySchema>;

/**
 * `POST /products/:id/variants` (CAT-03): one value per attribute.
 * `priceExtra` defaults to the sum of the values' extras; `name` to their names.
 */
export const createVariantSchema = z.object({
  attributeValueIds: z.array(z.uuid()).min(1).max(10),
  name: z.string().trim().min(1).max(160).optional(),
  priceExtra: nonNegativeMoneySchema.optional(),
});
export type CreateVariantDto = z.infer<typeof createVariantSchema>;

export const updateVariantSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    priceExtra: nonNegativeMoneySchema,
    isActive: z.boolean(),
  })
  .partial();
export type UpdateVariantDto = z.infer<typeof updateVariantSchema>;

/** `GET /variants?q=` picker: active variants of active products only. */
export const variantPickerQuerySchema = paginationQuerySchema.extend({
  productId: z.uuid().optional(),
});
export type VariantPickerQueryDto = z.infer<typeof variantPickerQuerySchema>;
