import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  type CreateQuotationTemplateDto,
  type IdParamDto,
  type QuotationTemplateListQueryDto,
  type UpdateQuotationTemplateDto,
  createQuotationTemplateSchema,
  idParamSchema,
  quotationTemplateListQuerySchema,
  updateQuotationTemplateSchema,
} from '@brightloop/shared';
import { Roles } from '../../common/auth/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { QuotationTemplatesService } from './quotation-templates.service.js';

const idPipe = new ZodValidationPipe(idParamSchema);

@Roles('ADMIN', 'STAFF')
@Controller('quotation-templates')
export class QuotationTemplatesController {
  constructor(private readonly service: QuotationTemplatesService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(quotationTemplateListQuerySchema))
    query: QuotationTemplateListQueryDto,
  ) {
    return this.service.list(query);
  }

  @Get(':id')
  get(@Param(idPipe) { id }: IdParamDto) {
    return this.service.get(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createQuotationTemplateSchema))
    body: CreateQuotationTemplateDto,
  ) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(
    @Param(idPipe) { id }: IdParamDto,
    @Body(new ZodValidationPipe(updateQuotationTemplateSchema))
    body: UpdateQuotationTemplateDto,
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param(idPipe) { id }: IdParamDto) {
    return this.service.remove(id);
  }
}
