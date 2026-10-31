import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import type {
  CreateStaffDto,
  UpdateUserDto,
  UserListQueryDto,
} from '@brightloop/shared';
import { DomainError } from '../../common/errors/domain.error.js';
import {
  isUniqueViolation,
  notFound,
} from '../../common/errors/prisma-errors.js';
import {
  type PaginatedResult,
  paginate,
} from '../../common/pagination/pagination.helper.js';
import { pageArgs, parseSort } from '../../common/pagination/page.js';

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  passwordHash: true,
  customer: { select: { id: true } },
} satisfies Prisma.UserSelect;

type UserRecord = Prisma.UserGetPayload<{ select: typeof userSelect }>;

/** User row for the admin Users page (ADM-02). Never exposes the hash. */
export interface UserView {
  id: string;
  name: string;
  email: string;
  role: UserRecord['role'];
  isActive: boolean;
  invitePending: boolean;
  customerId: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

function toView({ passwordHash, customer, ...user }: UserRecord): UserView {
  return {
    ...user,
    invitePending: passwordHash === null,
    customerId: customer?.id ?? null,
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: UserListQueryDto): Promise<PaginatedResult<UserView>> {
    const where: Prisma.UserWhereInput = {
      role: query.role,
      isActive: query.isActive,
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [field, direction] = parseSort(
      query.sort,
      ['name', 'email', 'role', 'createdAt'] as const,
      ['name', 'asc'],
    );
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: [{ [field]: direction }, { id: 'asc' }],
        ...pageArgs(query.page, query.pageSize),
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(rows.map(toView), total, query.page, query.pageSize);
  }

  /** Creates a STAFF user without a password; the invite sets it (AUTH-05). */
  async createStaff(dto: CreateStaffDto): Promise<UserView> {
    try {
      const user = await this.prisma.user.create({
        data: { ...dto, role: 'STAFF' },
        select: userSelect,
      });
      return toView(user);
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

  /**
   * Renames or (de)activates a staff or customer user. Deactivation revokes
   * every refresh token in the same transaction (AUTH-07). Admin accounts
   * cannot be changed here, so the last admin cannot lock themselves out.
   */
  async update(id: string, dto: UpdateUserDto): Promise<UserView> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { id },
        select: { role: true },
      });
      if (!existing) throw notFound('User');
      if (existing.role === 'ADMIN') {
        throw new DomainError(
          'FORBIDDEN',
          'Admin accounts cannot be changed from the Users page',
          403,
        );
      }
      if (dto.isActive === false) {
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      const user = await tx.user.update({
        where: { id },
        data: dto,
        select: userSelect,
      });
      return toView(user);
    });
  }
}
