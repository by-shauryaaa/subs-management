import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

export interface SystemSettings {
  companyName: string;
  companyAddress: string;
  companyTaxId: string;
  currency: string;
  timezone: string;
  autoConfirmInvoices: boolean;
  defaultQuotationValidityDays: number;
  invoiceFooter: string;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  companyName: 'Brightloop',
  companyAddress: '',
  companyTaxId: '',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  autoConfirmInvoices: true,
  defaultQuotationValidityDays: 30,
  invoiceFooter: '',
};

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private cachedSettings: SystemSettings | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Return typed system settings, reading from cache if available.
   */
  async getSettings(): Promise<SystemSettings> {
    if (this.cachedSettings) {
      return this.cachedSettings;
    }

    try {
      const rows = await this.prisma.setting.findMany();
      const settings: SystemSettings = { ...DEFAULT_SETTINGS };

      for (const row of rows) {
        if (row.key in settings) {
          (settings as unknown as Record<string, unknown>)[row.key] =
            row.value as unknown;
        }
      }

      this.cachedSettings = settings;
      return settings;
    } catch (error) {
      this.logger.warn(
        'Unable to query Setting table, falling back to default settings',
        error,
      );
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Get a specific setting value.
   */
  async get<K extends keyof SystemSettings>(key: K): Promise<SystemSettings[K]> {
    const settings = await this.getSettings();
    return settings[key];
  }

  /**
   * Update one or more settings, writing to DB and refreshing the cache.
   */
  async updateSettings(
    partial: Partial<SystemSettings>,
    client?: Prisma.TransactionClient,
  ): Promise<SystemSettings> {
    const db = client ?? this.prisma;

    for (const [key, value] of Object.entries(partial)) {
      if (value !== undefined) {
        await db.setting.upsert({
          where: { key },
          create: { key, value: value as Prisma.InputJsonValue },
          update: { value: value as Prisma.InputJsonValue },
        });
      }
    }

    this.invalidateCache();
    return this.getSettings();
  }

  /**
   * Invalidate the in-memory settings cache.
   */
  invalidateCache(): void {
    this.cachedSettings = null;
  }
}
