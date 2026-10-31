import { z } from 'zod';
import {
  PAGE_SIZE_DEFAULT,
  PAGE_SIZE_MAX,
  PASSWORD_REGEX,
  PASSWORD_RULE_MESSAGE,
} from '../constants.js';

/**
 * UUID route parameter schema (e.g. /subscriptions/:id).
 */
export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format; expected UUID' }),
});
export type IdParamDto = z.infer<typeof idParamSchema>;

/**
 * Date string in YYYY-MM-DD format.
 */
export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'Date must be in YYYY-MM-DD format',
});

/**
 * Money string schema ensuring non-empty decimal with up to 2 decimal places.
 */
export const moneyStringSchema = z.string().regex(/^-?\d+(\.\d{1,2})?$/, {
  message: 'Money amount must be a number string with up to 2 decimal places',
});

/**
 * Standard email schema: trimmed, lowercased, valid email format.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: 'Invalid email address' });

/**
 * Password schema per PRD AUTH-01:
 * - At least 9 characters ("more than eight")
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one special character
 */
export const passwordSchema = z
  .string()
  .regex(PASSWORD_REGEX, { message: PASSWORD_RULE_MESSAGE });

/**
 * Common pagination query parameters.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGE_SIZE_MAX)
    .default(PAGE_SIZE_DEFAULT),
  q: z.string().trim().optional(),
  sort: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]+:(asc|desc)$/, {
      message: 'Sort must be in format "field:asc" or "field:desc"',
    })
    .optional(),
});
export type PaginationQueryDto = z.infer<typeof paginationQuerySchema>;

/**
 * Standard date range filter query schema.
 */
export const dateRangeQuerySchema = z.object({
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
});
export type DateRangeQueryDto = z.infer<typeof dateRangeQuerySchema>;
