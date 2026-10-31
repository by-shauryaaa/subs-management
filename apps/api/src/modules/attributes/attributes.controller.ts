import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  type CreateAttributeDto,
  type CreateAttributeValueDto,
  type IdParamDto,
  type PaginationQueryDto,
  type UpdateAttributeDto,
  type UpdateAttributeValueDto,
  createAttributeSchema,
  createAttributeValueSchema,
  idParamSchema,
  paginationQuerySchema,
  updateAttributeSchema,
  updateAttributeValueSchema,
} from '@brightloop/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AttributesService } from './attributes.service.js';

const idPipe = new ZodValidationPipe(idParamSchema);

/** Reads: Admin and Staff; writes: Admin. Role guards are added with P1-02. */
@Controller('attributes')
export class AttributesController {
  constructor(private readonly attributes: AttributesService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: PaginationQueryDto,
  ) {
    return this.attributes.list(query);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createAttributeSchema))
    body: CreateAttributeDto,
  ) {
    return this.attributes.create(body);
  }

  @Patch(':id')
  update(
    @Param(idPipe) { id }: IdParamDto,
    @Body(new ZodValidationPipe(updateAttributeSchema))
    body: UpdateAttributeDto,
  ) {
    return this.attributes.update(id, body);
  }

  @Post(':id/values')
  addValue(
    @Param(idPipe) { id }: IdParamDto,
    @Body(new ZodValidationPipe(createAttributeValueSchema))
    body: CreateAttributeValueDto,
  ) {
    return this.attributes.addValue(id, body);
  }
}

@Controller('attribute-values')
export class AttributeValuesController {
  constructor(private readonly attributes: AttributesService) {}

  @Patch(':id')
  update(
    @Param(idPipe) { id }: IdParamDto,
    @Body(new ZodValidationPipe(updateAttributeValueSchema))
    body: UpdateAttributeValueDto,
  ) {
    return this.attributes.updateValue(id, body);
  }
}
