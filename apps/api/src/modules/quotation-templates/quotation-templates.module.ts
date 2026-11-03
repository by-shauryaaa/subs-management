import { Module } from '@nestjs/common';
import { QuotationTemplatesController } from './quotation-templates.controller.js';
import { QuotationTemplatesService } from './quotation-templates.service.js';

@Module({
  controllers: [QuotationTemplatesController],
  providers: [QuotationTemplatesService],
  exports: [QuotationTemplatesService],
})
export class QuotationTemplatesModule {}
