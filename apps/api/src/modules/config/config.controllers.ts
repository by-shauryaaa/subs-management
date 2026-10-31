import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  BILLING_PERIODS,
  type IdParamDto,
  type PaginationQueryDto,
  dateStringSchema,
  idParamSchema,
  nonNegativeMoneySchema,
  paginationQuerySchema,
} from '@brightloop/shared';
import { Roles } from '../../common/auth/roles.decorator.js';
import { DomainError } from '../../common/errors/domain.error.js';
import {
  isRecordNotFound,
  isUniqueViolation,
  notFound,
} from '../../common/errors/prisma-errors.js';
import { paginate } from '../../common/pagination/pagination.helper.js';
import { pageArgs } from '../../common/pagination/page.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const idPipe = new ZodValidationPipe(idParamSchema);
const listPipe = new ZodValidationPipe(paginationQuerySchema);
const date = (value: string | null | undefined) =>
  value
    ? new Date(`${value}T00:00:00.000Z`)
    : value === null
      ? null
      : undefined;
const iso = (value: Date | null) =>
  value ? value.toISOString().slice(0, 10) : null;

async function guard<T>(entity: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (isUniqueViolation(error))
      throw new DomainError('NAME_TAKEN', 'This name is already in use', 409);
    if (isRecordNotFound(error)) throw notFound(entity);
    throw error;
  }
}

// ---------- Taxes (TAX-01) ----------
const taxSchema = z.object({
  name: z.string().trim().min(1).max(80),
  rate: z.coerce
    .number()
    .min(0)
    .max(100)
    .transform((v) => v.toFixed(2)),
  description: z.string().trim().max(200).nullish(),
  isActive: z.boolean().default(true),
});
const taxView = (t: Prisma.TaxGetPayload<object>) => ({
  ...t,
  rate: t.rate.toFixed(2),
});

@Controller('taxes')
export class TaxesController {
  constructor(private readonly prisma: PrismaClient) {}

  @Roles('ADMIN', 'STAFF')
  @Get()
  async list(@Query(listPipe) q: PaginationQueryDto) {
    const where: Prisma.TaxWhereInput = q.q
      ? { name: { contains: q.q, mode: 'insensitive' } }
      : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.tax.findMany({
        where,
        orderBy: { rate: 'asc' },
        ...pageArgs(q.page, q.pageSize),
      }),
      this.prisma.tax.count({ where }),
    ]);
    return paginate(rows.map(taxView), total, q.page, q.pageSize);
  }

  @Roles('ADMIN')
  @Post()
  create(
    @Body(new ZodValidationPipe(taxSchema)) body: z.infer<typeof taxSchema>,
  ) {
    return guard('Tax', async () =>
      taxView(await this.prisma.tax.create({ data: body })),
    );
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param(idPipe) { id }: IdParamDto,
    @Body(new ZodValidationPipe(taxSchema.partial()))
    body: Partial<z.infer<typeof taxSchema>>,
  ) {
    return guard('Tax', async () =>
      taxView(await this.prisma.tax.update({ where: { id }, data: body })),
    );
  }
}

// ---------- Payment terms ----------
const termSchema = z.object({
  name: z.string().trim().min(1).max(80),
  dueDays: z.coerce.number().int().min(0).max(365),
  isActive: z.boolean().default(true),
});

@Controller('payment-terms')
export class PaymentTermsController {
  constructor(private readonly prisma: PrismaClient) {}

  @Roles('ADMIN', 'STAFF')
  @Get()
  async list(@Query(listPipe) q: PaginationQueryDto) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.paymentTerm.findMany({
        orderBy: { dueDays: 'asc' },
        ...pageArgs(q.page, q.pageSize),
      }),
      this.prisma.paymentTerm.count(),
    ]);
    return paginate(rows, total, q.page, q.pageSize);
  }

  @Roles('ADMIN')
  @Post()
  create(
    @Body(new ZodValidationPipe(termSchema)) body: z.infer<typeof termSchema>,
  ) {
    return guard('Payment term', () =>
      this.prisma.paymentTerm.create({ data: body }),
    );
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param(idPipe) { id }: IdParamDto,
    @Body(new ZodValidationPipe(termSchema.partial()))
    body: Partial<z.infer<typeof termSchema>>,
  ) {
    return guard('Payment term', () =>
      this.prisma.paymentTerm.update({ where: { id }, data: body }),
    );
  }
}

// ---------- Plans (PLAN-01..03) ----------
const planSchema = z.object({
  name: z.string().trim().min(1).max(120),
  price: nonNegativeMoneySchema,
  billingPeriod: z.enum(BILLING_PERIODS),
  minQuantity: z.coerce.number().int().min(1).default(1),
  availableFrom: dateStringSchema.nullish(),
  availableUntil: dateStringSchema.nullish(),
  autoClose: z.boolean().default(false),
  closable: z.boolean().default(true),
  pausable: z.boolean().default(false),
  renewable: z.boolean().default(true),
  isActive: z.boolean().default(true),
});
type PlanBody = Partial<z.infer<typeof planSchema>>;
const planData = (b: PlanBody) => ({
  ...b,
  availableFrom: date(b.availableFrom),
  availableUntil: date(b.availableUntil),
});
export const planView = (p: Prisma.PlanGetPayload<object>) => ({
  ...p,
  price: p.price.toFixed(2),
  availableFrom: iso(p.availableFrom),
  availableUntil: iso(p.availableUntil),
});

@Controller('plans')
export class PlansController {
  constructor(private readonly prisma: PrismaClient) {}

  @Roles('ADMIN', 'STAFF')
  @Get()
  async list(@Query(listPipe) q: PaginationQueryDto) {
    const where: Prisma.PlanWhereInput = q.q
      ? { name: { contains: q.q, mode: 'insensitive' } }
      : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.plan.findMany({
        where,
        orderBy: { name: 'asc' },
        ...pageArgs(q.page, q.pageSize),
      }),
      this.prisma.plan.count({ where }),
    ]);
    return paginate(rows.map(planView), total, q.page, q.pageSize);
  }

  @Roles('ADMIN', 'STAFF')
  @Get(':id')
  async get(@Param(idPipe) { id }: IdParamDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw notFound('Plan');
    return planView(plan);
  }

  @Roles('ADMIN')
  @Post()
  async create(
    @Body(new ZodValidationPipe(planSchema)) body: z.infer<typeof planSchema>,
  ) {
    return planView(
      await this.prisma.plan.create({
        data: planData(body) as Prisma.PlanCreateInput,
      }),
    );
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param(idPipe) { id }: IdParamDto,
    @Body(new ZodValidationPipe(planSchema.partial())) body: PlanBody,
  ) {
    return guard('Plan', async () =>
      planView(
        await this.prisma.plan.update({ where: { id }, data: planData(body) }),
      ),
    );
  }
}

// ---------- Settings (ADM-01) ----------
const settingsSchema = z
  .object({
    companyName: z.string().trim().max(160),
    companyAddress: z.string().trim().max(500),
    companyTaxId: z.string().trim().max(40),
    currency: z.string().trim().length(3).toUpperCase(),
    timezone: z.string().trim().min(1).max(64),
    autoConfirmInvoices: z.boolean(),
    defaultQuotationValidityDays: z.coerce.number().int().min(1).max(365),
    invoiceFooter: z.string().trim().max(500),
  })
  .partial();

export async function readSettings(
  prisma: PrismaClient | Prisma.TransactionClient,
) {
  const rows = await prisma.setting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as {
    companyName?: string;
    currency?: string;
    timezone?: string;
    autoConfirmInvoices?: boolean;
    defaultQuotationValidityDays?: number;
    invoiceFooter?: string;
    [key: string]: unknown;
  };
}

@Controller('settings')
export class SettingsController {
  constructor(private readonly prisma: PrismaClient) {}

  @Roles('ADMIN', 'STAFF')
  @Get()
  get() {
    return readSettings(this.prisma);
  }

  @Roles('ADMIN')
  @Patch()
  async update(
    @Body(new ZodValidationPipe(settingsSchema))
    body: z.infer<typeof settingsSchema>,
  ) {
    await this.prisma.$transaction(
      Object.entries(body).map(([key, value]) =>
        this.prisma.setting.upsert({
          where: { key },
          create: { key, value: value as Prisma.InputJsonValue },
          update: { value: value as Prisma.InputJsonValue },
        }),
      ),
    );
    return readSettings(this.prisma);
  }
}
