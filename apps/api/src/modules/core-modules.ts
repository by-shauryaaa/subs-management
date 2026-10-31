import { Module } from '@nestjs/common';
import {
  PaymentTermsController,
  PlansController,
  SettingsController,
  TaxesController,
} from './config/config.controllers.js';
import { InvoicesController } from './invoices/invoices.controller.js';
import { SubscriptionsController } from './subscriptions/subscriptions.controller.js';
import { SubscriptionsService } from './subscriptions/subscriptions.service.js';

@Module({
  controllers: [
    TaxesController,
    PaymentTermsController,
    PlansController,
    SettingsController,
  ],
})
export class ConfigModule {}

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}

@Module({ controllers: [InvoicesController] })
export class InvoicesModule {}
