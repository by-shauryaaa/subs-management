import { z } from 'zod';
import {
  dateStringSchema,
  moneyStringSchema,
  paginationQuerySchema,
} from './common.js';
import { optionalTextSchema } from './customers.js';
import { booleanQuerySchema } from './users.js';

export const quotationTemplateLineSchema = z.object({
  id: z.string().uuid().optional(),
  variantId: z.string().uuid({ message: 'Valid variant ID is required' }),
  quantity: z.number().int().min(1, { message: 'Quantity must be at least 1' }).default(1),
  unitPrice: moneyStringSchema.nullish(),
  sequence: z.number().int().min(0).default(0),
});
export type QuotationTemplateLineDto = z.infer<typeof quotationTemplateLineSchema>;

export const createQuotationTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(160),
  validityDays: z.number().int().min(1, 'Validity days must be at least 1').default(30),
  planId: z.string().uuid({ message: 'Valid plan ID is required' }),
  paymentTermId: z.string().uuid().nullish(),
  notes: optionalTextSchema(2000),
  isActive: z.boolean().default(true),
  lines: z.array(quotationTemplateLineSchema).default([]),
});
export type CreateQuotationTemplateDto = z.infer<typeof createQuotationTemplateSchema>;

export const updateQuotationTemplateSchema = createQuotationTemplateSchema.partial();
export type UpdateQuotationTemplateDto = z.infer<typeof updateQuotationTemplateSchema>;

export const quotationTemplateListQuerySchema = paginationQuerySchema.extend({
  isActive: booleanQuerySchema.optional(),
  planId: z.string().uuid().optional(),
});
export type QuotationTemplateListQueryDto = z.infer<typeof quotationTemplateListQuerySchema>;

export const fromTemplateSchema = z.object({
  templateId: z.string().uuid({ message: 'Valid template ID is required' }),
  customerId: z.string().uuid({ message: 'Valid customer ID is required' }),
  startDate: dateStringSchema.optional(),
});
export type FromTemplateDto = z.infer<typeof fromTemplateSchema>;
