import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  type CreateProductDto,
  type CreateVariantDto,
  type IdParamDto,
  type ProductListQueryDto,
  type UpdateProductDto,
  createProductSchema,
  createVariantSchema,
  idParamSchema,
  productListQuerySchema,
  updateProductSchema,
} from '@brightloop/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ProductsService } from './products.service.js';
import { VariantsService } from './variants.service.js';

const idPipe = new ZodValidationPipe(idParamSchema);

/** Reads: Admin and Staff; writes: Admin (PRD §5.1). Role guards are added with P1-02. */
@Controller('products')
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly variants: VariantsService,
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(productListQuerySchema))
    query: ProductListQueryDto,
  ) {
    return this.products.list(query);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createProductSchema)) body: CreateProductDto,
  ) {
    return this.products.create(body);
  }

  @Get(':id')
  get(@Param(idPipe) { id }: IdParamDto) {
    return this.products.get(id);
  }

  @Patch(':id')
  update(
    @Param(idPipe) { id }: IdParamDto,
    @Body(new ZodValidationPipe(updateProductSchema)) body: UpdateProductDto,
  ) {
    return this.products.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param(idPipe) { id }: IdParamDto): Promise<void> {
    await this.products.remove(id);
  }

  @Get(':id/variants')
  listVariants(@Param(idPipe) { id }: IdParamDto) {
    return this.variants.listForProduct(id);
  }

  @Post(':id/variants')
  createVariant(
    @Param(idPipe) { id }: IdParamDto,
    @Body(new ZodValidationPipe(createVariantSchema)) body: CreateVariantDto,
  ) {
    return this.variants.create(id, body);
  }
}
