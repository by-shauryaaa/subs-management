import { Module } from '@nestjs/common';
import {
  AttributesController,
  AttributeValuesController,
} from './attributes.controller.js';
import { AttributesService } from './attributes.service.js';

@Module({
  controllers: [AttributesController, AttributeValuesController],
  providers: [AttributesService],
  exports: [AttributesService],
})
export class AttributesModule {}
