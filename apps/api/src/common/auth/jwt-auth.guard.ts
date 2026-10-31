import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';
import { loadEnvironment } from '../../config/environment.js';
import { verifyAccess } from '../../modules/auth/tokens.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { ROLES_KEY } from './roles.decorator.js';

/** Verifies the Bearer access token, then the route's @Roles (if any). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly secret = loadEnvironment().JWT_ACCESS_SECRET;

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: unknown;
    }>();
    const [scheme, token] = (request.headers['authorization'] ?? '').split(' ');
    const payload =
      scheme === 'Bearer' && token ? verifyAccess(token, this.secret) : null;
    if (!payload) throw new UnauthorizedException('Not signed in');
    request.user = {
      sub: payload.sub,
      role: payload.role,
      customerId: payload.customerId,
    };
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      targets,
    );
    if (roles && !roles.includes(payload.role)) {
      throw new ForbiddenException('You do not have access to this action');
    }
    return true;
  }
}
