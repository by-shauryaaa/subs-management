import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { type IdParamDto, idParamSchema } from '@brightloop/shared';
import { Roles } from '../../common/auth/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import {
  DiscountsService,
  createDiscountSchema,
  discountQuerySchema,
  updateDiscountSchema,
} from './discounts.service.js';

const idPipe = new ZodValidationPipe(idParamSchema);

@Roles('ADMIN', 'STAFF')
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discounts: DiscountsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(discountQuerySchema))
    query: z.infer<typeof discountQuerySchema>,
  ) {
    return this.discounts.list(query);
  }

  @Get(':id')
  get(@Param(idPipe) { id }: IdParamDto) {
    return this.discounts.get(id);
  }

  @Roles('ADMIN')
  @Post()
  create(
    @Body(new ZodValidationPipe(createDiscountSchema))
    body: z.infer<typeof createDiscountSchema>,
  ) {
    return this.discounts.create(body);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param(idPipe) { id }: IdParamDto,
    @Body(new ZodValidationPipe(updateDiscountSchema))
    body: z.infer<typeof updateDiscountSchema>,
  ) {
    return this.discounts.update(id, body);
  }
}
