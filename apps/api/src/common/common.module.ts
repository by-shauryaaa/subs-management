import { Global, Module } from '@nestjs/common';
import { NumberingService } from './numbering/numbering.service.js';
import { AuditService } from './audit/audit.service.js';
import { SettingsService } from './settings/settings.service.js';
import { MailService } from './mail/mail.service.js';
import { InvoicePdfService } from './pdf/invoice-pdf.service.js';

@Global()
@Module({
  providers: [
    NumberingService,
    AuditService,
    SettingsService,
    MailService,
    InvoicePdfService,
  ],
  exports: [
    NumberingService,
    AuditService,
    SettingsService,
    MailService,
    InvoicePdfService,
  ],
})
export class CommonModule {}
