import { Module } from '@nestjs/common';
import { InvoicesModule, SubscriptionsModule } from '../core-modules.js';
import { PortalController } from './portal.controller.js';
import { PortalService } from './portal.service.js';

@Module({
  imports: [SubscriptionsModule, InvoicesModule],
  controllers: [PortalController],
  providers: [PortalService],
  exports: [PortalService],
})
export class PortalModule {}
