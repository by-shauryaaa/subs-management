import { z } from 'zod';
import { emailSchema, paginationQuerySchema } from './common.js';

/** Trimmed text; empty strings become null so optional fields can be cleared. */
export const optionalTextSchema = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length > 0 ? value : null))
    .nullish();

export const personNameSchema = z.string().trim().min(1).max(120);

/**
 * Customer create body (AUTH-06). Creates a CUSTOMER user and sends an invite.
 */
export const createCustomerSchema = z.object({
  name: personNameSchema,
  email: emailSchema,
  companyName: optionalTextSchema(160),
  phone: optionalTextSchema(40),
  billingAddress: optionalTextSchema(500),
  taxId: optionalTextSchema(40),
});
export type CreateCustomerDto = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();
export type UpdateCustomerDto = z.infer<typeof updateCustomerSchema>;

/** `GET /customers`: `q` matches name, email or company. Sort: name, email, companyName, createdAt. */
export const customerListQuerySchema = paginationQuerySchema;
export type CustomerListQueryDto = z.infer<typeof customerListQuerySchema>;
