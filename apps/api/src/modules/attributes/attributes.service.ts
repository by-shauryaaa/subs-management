import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import type {
  CreateAttributeDto,
  CreateAttributeValueDto,
  PaginationQueryDto,
  UpdateAttributeDto,
  UpdateAttributeValueDto,
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
import { pageArgs } from '../../common/pagination/page.js';

const valueSelect = {
  id: true,
  attributeId: true,
  name: true,
  priceExtra: true,
} satisfies Prisma.AttributeValueSelect;

const attributeSelect = {
  id: true,
  name: true,
  values: { select: valueSelect, orderBy: { name: 'asc' } },
} satisfies Prisma.ProductAttributeSelect;

type ValueRecord = Prisma.AttributeValueGetPayload<{
  select: typeof valueSelect;
}>;

export interface AttributeValueView {
  id: string;
  attributeId: string;
  name: string;
  priceExtra: string;
}

export interface AttributeView {
  id: string;
  name: string;
  values: AttributeValueView[];
}

const toValueView = (value: ValueRecord): AttributeValueView => ({
  ...value,
  priceExtra: value.priceExtra.toFixed(2),
});

const toView = (
  attribute: Prisma.ProductAttributeGetPayload<{
    select: typeof attributeSelect;
  }>,
): AttributeView => ({
  ...attribute,
  values: attribute.values.map(toValueView),
});

const nameTaken = () =>
  new DomainError('NAME_TAKEN', 'This name is already in use', 409);

/** Attributes and their values with price extras (CAT-02). */
@Injectable()
export class AttributesService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<AttributeView>> {
    const where: Prisma.ProductAttributeWhereInput = query.q
      ? { name: { contains: query.q, mode: 'insensitive' } }
      : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.productAttribute.findMany({
        where,
        select: attributeSelect,
        orderBy: { name: 'asc' },
        ...pageArgs(query.page, query.pageSize),
      }),
      this.prisma.productAttribute.count({ where }),
    ]);
    return paginate(rows.map(toView), total, query.page, query.pageSize);
  }

  async create(dto: CreateAttributeDto): Promise<AttributeView> {
    return this.mapErrors('Attribute', async () =>
      toView(
        await this.prisma.productAttribute.create({
          data: { name: dto.name, values: { create: dto.values } },
          select: attributeSelect,
        }),
      ),
    );
  }

  async update(id: string, dto: UpdateAttributeDto): Promise<AttributeView> {
    return this.mapErrors('Attribute', async () =>
      toView(
        await this.prisma.productAttribute.update({
          where: { id },
          data: dto,
          select: attributeSelect,
        }),
      ),
    );
  }

  async addValue(
    attributeId: string,
    dto: CreateAttributeValueDto,
  ): Promise<AttributeValueView> {
    const exists = await this.prisma.productAttribute.count({
      where: { id: attributeId },
    });
    if (!exists) throw notFound('Attribute');
    return this.mapErrors('Attribute value', async () =>
      toValueView(
        await this.prisma.attributeValue.create({
          data: { ...dto, attributeId },
          select: valueSelect,
        }),
      ),
    );
  }

  /** Existing variants keep their own price extra; only new variants use the change. */
  async updateValue(
    id: string,
    dto: UpdateAttributeValueDto,
  ): Promise<AttributeValueView> {
    return this.mapErrors('Attribute value', async () =>
      toValueView(
        await this.prisma.attributeValue.update({
          where: { id },
          data: dto,
          select: valueSelect,
        }),
      ),
    );
  }

  private async mapErrors<T>(
    entity: string,
    run: () => Promise<T>,
  ): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (isUniqueViolation(error)) throw nameTaken();
      if (isRecordNotFound(error)) throw notFound(entity);
      throw error;
    }
  }
}
