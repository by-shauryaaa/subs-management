import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { VariantsController } from './variants.controller.js';
import { VariantsService } from './variants.service.js';

@Module({
  controllers: [ProductsController, VariantsController],
  providers: [ProductsService, VariantsService],
  exports: [ProductsService, VariantsService],
})
export class ProductsModule {}
