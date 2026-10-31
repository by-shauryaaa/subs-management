import { z } from 'zod';
import { nonNegativeMoneySchema } from './products.js';

export const attributeValueSchema = z.object({
  name: z.string().trim().min(1).max(80),
  priceExtra: nonNegativeMoneySchema.default('0.00'),
});
export type AttributeValueDto = z.infer<typeof attributeValueSchema>;

/** `POST /attributes` (CAT-02), optionally with its first values. */
export const createAttributeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  values: z.array(attributeValueSchema).max(50).default([]),
});
export type CreateAttributeDto = z.infer<typeof createAttributeSchema>;

export const updateAttributeSchema = z.object({
  name: z.string().trim().min(1).max(80),
});
export type UpdateAttributeDto = z.infer<typeof updateAttributeSchema>;

/** `POST /attributes/:id/values`. */
export const createAttributeValueSchema = attributeValueSchema;
export type CreateAttributeValueDto = z.infer<
  typeof createAttributeValueSchema
>;

/** `PATCH /attribute-values/:id`. Existing variants keep their own price extra. */
export const updateAttributeValueSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    priceExtra: nonNegativeMoneySchema,
  })
  .partial();
export type UpdateAttributeValueDto = z.infer<
  typeof updateAttributeValueSchema
>;
