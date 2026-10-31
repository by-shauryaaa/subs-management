import {
  SetMetadata,
  createParamDecorator,
  type CustomDecorator,
  type ExecutionContext,
} from '@nestjs/common';
import type { Role } from '@prisma/client';
import type { AccessPayload } from '../../modules/auth/tokens.js';

export const ROLES_KEY = 'roles';
/** Restricts a route (or controller) to these roles; checked by JwtAuthGuard. */
export const Roles = (...roles: Role[]): CustomDecorator =>
  SetMetadata(ROLES_KEY, roles);

export type AuthUser = Omit<AccessPayload, 'exp'>;

/** The authenticated user from the access token. */
export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
