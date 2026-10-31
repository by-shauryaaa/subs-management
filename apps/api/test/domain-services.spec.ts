import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../src/common/prisma/prisma.service.js';
import { NumberingService } from '../src/common/numbering/numbering.service.js';
import { AuditService } from '../src/common/audit/audit.service.js';
import {
  SettingsService,
  DEFAULT_SETTINGS,
} from '../src/common/settings/settings.service.js';
import { MailService } from '../src/common/mail/mail.service.js';

describe('Domain Services (P0-06)', () => {
  describe('NumberingService', () => {
    let numberingService: NumberingService;
    let sequenceCounter: number;

    beforeEach(() => {
      sequenceCounter = 0;
      // Simulated atomic DB increment
      const mockPrisma = {
        $queryRaw: async () => {
          sequenceCounter += 1;
          return [{ value: sequenceCounter }];
        },
      } as unknown as PrismaService;

      numberingService = new NumberingService(mockPrisma);
    });

    it('generates formatted document number with padding', async () => {
      const num = await numberingService.next('SUB', 2026);
      expect(num).toBe('SUB/2026/00001');
    });

    it('generates gap-free, unique numbers under 20 parallel calls', async () => {
      const promises = Array.from({ length: 20 }, () =>
        numberingService.next('INV', 2026),
      );

      const results = await Promise.all(promises);

      // Unique count must be 20
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(20);

      // Must cover exactly 00001 to 00020
      const expected = Array.from(
        { length: 20 },
        (_, i) => `INV/2026/${String(i + 1).padStart(5, '0')}`,
      );

      expect(results.sort()).toEqual(expected.sort());
    });
  });

  describe('AuditService', () => {
    it('creates audit log record with provided parameters', async () => {
      let createCallCount = 0;
      const mockCreate = async ({
        data,
      }: {
        data: Prisma.AuditLogUncheckedCreateInput;
      }) => {
        createCallCount += 1;
        return {
          id: '123e4567-e89b-12d3-a456-426614174000',
          ...data,
          createdAt: new Date(),
        };
      };

      const mockPrisma = {
        auditLog: {
          create: mockCreate,
        },
      } as unknown as PrismaService;

      const auditService = new AuditService(mockPrisma);

      const entry = await auditService.log({
        actorId: 'usr-1',
        actorRole: 'ADMIN',
        entityType: 'Subscription',
        entityId: 'sub-123',
        action: 'transition:confirm',
        fromStatus: 'QUOTATION',
        toStatus: 'CONFIRMED',
        meta: { ip: '127.0.0.1' },
      });

      expect(createCallCount).toBe(1);
      expect(entry.entityType).toBe('Subscription');
      expect(entry.action).toBe('transition:confirm');
      expect(entry.toStatus).toBe('CONFIRMED');
    });
  });

  describe('SettingsService', () => {
    it('returns default settings when database rows are empty', async () => {
      const mockPrisma = {
        setting: {
          findMany: async () => [],
        },
      } as unknown as PrismaService;

      const settingsService = new SettingsService(mockPrisma);
      const settings = await settingsService.getSettings();

      expect(settings).toEqual(DEFAULT_SETTINGS);
      expect(settings.currency).toBe('INR');
      expect(settings.timezone).toBe('Asia/Kolkata');
    });

    it('caches settings and does not re-query database on second access', async () => {
      let findManyCalls = 0;
      const findManyMock = async () => {
        findManyCalls += 1;
        return [
          {
            key: 'companyName',
            value: 'Custom Brightloop',
            updatedAt: new Date(),
          },
        ];
      };

      const mockPrisma = {
        setting: {
          findMany: findManyMock,
        },
      } as unknown as PrismaService;

      const settingsService = new SettingsService(mockPrisma);

      const first = await settingsService.get('companyName');
      const second = await settingsService.get('companyName');

      expect(first).toBe('Custom Brightloop');
      expect(second).toBe('Custom Brightloop');
      expect(findManyCalls).toBe(1);
    });

    it('invalidates cache when updating settings', async () => {
      let storedValue = 'Initial Name';
      const mockPrisma = {
        setting: {
          findMany: async () => [
            { key: 'companyName', value: storedValue, updatedAt: new Date() },
          ],
          upsert: async ({
            create,
          }: {
            create: { key: string; value: string };
          }) => {
            storedValue = create.value;
            return { key: 'companyName', value: storedValue };
          },
        },
      } as unknown as PrismaService;

      const settingsService = new SettingsService(mockPrisma);
      expect(await settingsService.get('companyName')).toBe('Initial Name');

      await settingsService.updateSettings({ companyName: 'Updated Name' });
      expect(await settingsService.get('companyName')).toBe('Updated Name');
    });
  });

  describe('MailService', () => {
    it('formats and sends emails via nodemailer transporter', async () => {
      const mailService = new MailService();
      type MailPayload = { to: string; subject: string; html: string };
      const sentPayloads: MailPayload[] = [];

      const transporter = (
        mailService as unknown as {
          transporter: {
            sendMail: (
              payload: MailPayload,
            ) => Promise<Record<string, unknown>>;
          };
        }
      ).transporter;

      transporter.sendMail = async (payload: MailPayload) => {
        sentPayloads.push(payload);
        return {};
      };

      await mailService.sendPasswordReset(
        'user@example.test',
        'http://localhost:5173/reset?token=xyz',
      );
      expect(sentPayloads).toHaveLength(1);
      expect(sentPayloads[0]?.to).toBe('user@example.test');
      expect(sentPayloads[0]?.html).toContain(
        'http://localhost:5173/reset?token=xyz',
      );

      await mailService.sendInvoice('client@example.test', 'INV/2026/00001');
      expect(sentPayloads).toHaveLength(2);
      expect(sentPayloads[1]?.subject).toContain('INV/2026/00001');
    });
  });
});
