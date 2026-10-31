import { z } from 'zod';
import { ROLES } from '../enums.js';
import { emailSchema, paginationQuerySchema } from './common.js';
import { personNameSchema } from './customers.js';

/** Query-string boolean: only "true" and "false" are accepted. */
export const booleanQuerySchema = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

/** Staff create body (AUTH-05). Creates a STAFF user and sends an invite. */
export const createStaffSchema = z.object({
  name: personNameSchema,
  email: emailSchema,
});
export type CreateStaffDto = z.infer<typeof createStaffSchema>;

/** `PATCH /users/:id`. Deactivating revokes the user's sessions (AUTH-07). */
export const updateUserSchema = z
  .object({
    name: personNameSchema,
    isActive: z.boolean(),
  })
  .partial();
export type UpdateUserDto = z.infer<typeof updateUserSchema>;

/** `GET /users`: `q` matches name or email. Sort: name, email, role, createdAt. */
export const userListQuerySchema = paginationQuerySchema.extend({
  role: z.enum(ROLES).optional(),
  isActive: booleanQuerySchema.optional(),
});
export type UserListQueryDto = z.infer<typeof userListQuerySchema>;
