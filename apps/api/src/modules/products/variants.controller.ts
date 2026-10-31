import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import {
  type IdParamDto,
  type UpdateVariantDto,
  type VariantPickerQueryDto,
  idParamSchema,
  updateVariantSchema,
  variantPickerQuerySchema,
} from '@brightloop/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { VariantsService } from './variants.service.js';

const idPipe = new ZodValidationPipe(idParamSchema);

/** Picker: Admin and Staff; writes: Admin. Role guards are added with P1-02. */
@Controller('variants')
export class VariantsController {
  constructor(private readonly variants: VariantsService) {}

  @Get()
  picker(
    @Query(new ZodValidationPipe(variantPickerQuerySchema))
    query: VariantPickerQueryDto,
  ) {
    return this.variants.picker(query);
  }

  @Patch(':id')
  update(
    @Param(idPipe) { id }: IdParamDto,
    @Body(new ZodValidationPipe(updateVariantSchema)) body: UpdateVariantDto,
  ) {
    return this.variants.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param(idPipe) { id }: IdParamDto): Promise<void> {
    await this.variants.remove(id);
  }
}
