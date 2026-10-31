import { Global, Module } from '@nestjs/common';
import { NumberingService } from './numbering/numbering.service.js';
import { AuditService } from './audit/audit.service.js';
import { SettingsService } from './settings/settings.service.js';
import { MailService } from './mail/mail.service.js';

@Global()
@Module({
  providers: [
    NumberingService,
    AuditService,
    SettingsService,
    MailService,
  ],
  exports: [
    NumberingService,
    AuditService,
    SettingsService,
    MailService,
  ],
})
export class CommonModule {}
