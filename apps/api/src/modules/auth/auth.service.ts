import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import { PrismaClient, type Role } from '@prisma/client';
import { loadEnvironment } from '../../config/environment.js';
import { DomainError } from '../../common/errors/domain.error.js';
import { isUniqueViolation } from '../../common/errors/prisma-errors.js';
import { randomToken, sha256, signAccess } from './tokens.js';

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    customerId: string | null;
  };
}

const invalidCredentials = () =>
  new DomainError('INVALID_CREDENTIALS', 'Email or password is incorrect', 401);

@Injectable()
export class AuthService {
  private readonly env = loadEnvironment();

  constructor(private readonly prisma: PrismaClient) {}

  async login(email: string, password: string): Promise<Session> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { customer: { select: { id: true } } },
    });
    if (!user?.passwordHash || !(await verify(user.passwordHash, password))) {
      throw invalidCredentials();
    }
    if (!user.isActive) {
      throw new DomainError(
        'ACCOUNT_DISABLED',
        'This account is disabled',
        403,
      );
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return this.issue(user.id);
  }

  /** Public signup always creates a CUSTOMER (AUTH-01). */
  async signup(
    name: string,
    email: string,
    password: string,
  ): Promise<Session> {
    try {
      const user = await this.prisma.user.create({
        data: {
          name,
          email,
          role: 'CUSTOMER',
          passwordHash: await hash(password),
          customer: { create: {} },
        },
      });
      return this.issue(user.id);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DomainError(
          'EMAIL_TAKEN',
          'This email is already in use',
          409,
        );
      }
      throw error;
    }
  }

  /** Rotates the refresh token: the old one is revoked, a new pair is issued. */
  async refresh(refreshToken: string | undefined): Promise<Session> {
    const invalid = new DomainError('UNAUTHENTICATED', 'Session expired', 401);
    if (!refreshToken) throw invalid;
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: { select: { isActive: true } } },
    });
    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt < new Date() ||
      !stored.user.isActive
    ) {
      throw invalid;
    }
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issue(stored.userId);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string): Promise<Session['user']> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { customer: { select: { id: true } } },
    });
    if (!user) throw new DomainError('UNAUTHENTICATED', 'Not signed in', 401);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      customerId: user.customer?.id ?? null,
    };
  }

  async changePassword(
    userId: string,
    current: string,
    next: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (!user.passwordHash || !(await verify(user.passwordHash, current))) {
      throw invalidCredentials();
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hash(next) },
    });
  }

  private async issue(userId: string): Promise<Session> {
    const user = await this.me(userId);
    const refreshToken = randomToken();
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(
          Date.now() + this.env.REFRESH_TTL_DAYS * 86_400_000,
        ),
      },
    });
    const accessToken = signAccess(
      { sub: user.id, role: user.role, customerId: user.customerId },
      this.env.JWT_ACCESS_SECRET,
      this.env.JWT_ACCESS_TTL,
    );
    return { accessToken, refreshToken, user };
  }
}
