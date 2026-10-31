import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import type {
  CreateCustomerDto,
  CustomerListQueryDto,
  UpdateCustomerDto,
} from '@brightloop/shared';
import { DomainError } from '../../common/errors/domain.error.js';
import {
  isRecordNotFound,
  isUniqueViolation,
  notFound,
} from '../../common/errors/prisma-errors.js';
import {
  type PaginatedResult,
  paginate,
} from '../../common/pagination/pagination.helper.js';
import { pageArgs, parseSort } from '../../common/pagination/page.js';

const customerSelect = {
  id: true,
  userId: true,
  companyName: true,
  phone: true,
  billingAddress: true,
  taxId: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: { name: true, email: true, isActive: true, passwordHash: true },
  },
} satisfies Prisma.CustomerSelect;

type CustomerRecord = Prisma.CustomerGetPayload<{
  select: typeof customerSelect;
}>;

/** Flat customer row returned by every customer endpoint. */
export interface CustomerView {
  id: string;
  userId: string;
  name: string;
  email: string;
  isActive: boolean;
  /** True until the customer accepts the invite and sets a password. */
  invitePending: boolean;
  companyName: string | null;
  phone: string | null;
  billingAddress: string | null;
  taxId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toView({ user, ...customer }: CustomerRecord): CustomerView {
  return {
    ...customer,
    name: user.name,
    email: user.email,
    isActive: user.isActive,
    invitePending: user.passwordHash === null,
  };
}

const emailTaken = () =>
  new DomainError('EMAIL_TAKEN', 'This email is already in use', 409);

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(
    query: CustomerListQueryDto,
  ): Promise<PaginatedResult<CustomerView>> {
    const where: Prisma.CustomerWhereInput = query.q
      ? {
          OR: [
            { user: { name: { contains: query.q, mode: 'insensitive' } } },
            { user: { email: { contains: query.q, mode: 'insensitive' } } },
            { companyName: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {};
    const [field, direction] = parseSort(
      query.sort,
      ['name', 'email', 'companyName', 'createdAt'] as const,
      ['name', 'asc'],
    );
    const orderBy: Prisma.CustomerOrderByWithRelationInput =
      field === 'name' || field === 'email'
        ? { user: { [field]: direction } }
        : { [field]: direction };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        select: customerSelect,
        orderBy: [orderBy, { id: 'asc' }],
        ...pageArgs(query.page, query.pageSize),
      }),
      this.prisma.customer.count({ where }),
    ]);
    return paginate(rows.map(toView), total, query.page, query.pageSize);
  }

  async get(id: string): Promise<CustomerView> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      select: customerSelect,
    });
    if (!customer) throw notFound('Customer');
    return toView(customer);
  }

  /** Creates the CUSTOMER user (no password) and profile in one transaction. */
  async create(dto: CreateCustomerDto): Promise<CustomerView> {
    const { name, email, ...profile } = dto;
    try {
      const customer = await this.prisma.customer.create({
        data: {
          ...profile,
          user: { create: { name, email, role: 'CUSTOMER' } },
        },
        select: customerSelect,
      });
      return toView(customer);
    } catch (error) {
      if (isUniqueViolation(error)) throw emailTaken();
      throw error;
    }
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<CustomerView> {
    const { name, email, ...profile } = dto;
    try {
      const customer = await this.prisma.customer.update({
        where: { id },
        data: {
          ...profile,
          ...(name !== undefined || email !== undefined
            ? { user: { update: { name, email } } }
            : {}),
        },
        select: customerSelect,
      });
      return toView(customer);
    } catch (error) {
      if (isUniqueViolation(error)) throw emailTaken();
      if (isRecordNotFound(error)) throw notFound('Customer');
      throw error;
    }
  }
}
