import { describe, expect, it } from 'vitest';
import {
  passwordSchema,
  paginationQuerySchema,
  idParamSchema,
  emailSchema,
  moneyStringSchema,
  dateStringSchema,
} from './common.js';

describe('common schemas', () => {
  describe('passwordSchema (PRD AUTH-01)', () => {
    it('accepts valid passwords meeting all criteria (>=9 chars, upper, lower, special)', () => {
      expect(passwordSchema.safeParse('Admin@12345').success).toBe(true);
      expect(passwordSchema.safeParse('Secure#Password9').success).toBe(true);
      expect(passwordSchema.safeParse('Bright!2026').success).toBe(true);
    });

    it('rejects passwords shorter than 9 characters', () => {
      // 8 characters
      const result = passwordSchema.safeParse('Abc!1234');
      expect(result.success).toBe(false);
    });

    it('rejects passwords without an uppercase letter', () => {
      const result = passwordSchema.safeParse('admin@12345');
      expect(result.success).toBe(false);
    });

    it('rejects passwords without a lowercase letter', () => {
      const result = passwordSchema.safeParse('ADMIN@12345');
      expect(result.success).toBe(false);
    });

    it('rejects passwords without a special character', () => {
      const result = passwordSchema.safeParse('Admin123456');
      expect(result.success).toBe(false);
    });
  });

  describe('paginationQuerySchema', () => {
    it('provides sensible defaults when empty', () => {
      const parsed = paginationQuerySchema.parse({});
      expect(parsed.page).toBe(1);
      expect(parsed.pageSize).toBe(25);
    });

    it('coerces string numbers correctly', () => {
      const parsed = paginationQuerySchema.parse({
        page: '3',
        pageSize: '50',
      });
      expect(parsed.page).toBe(3);
      expect(parsed.pageSize).toBe(50);
    });

    it('enforces maximum pageSize of 100', () => {
      const result = paginationQuerySchema.safeParse({ pageSize: '101' });
      expect(result.success).toBe(false);
    });

    it('validates sort format "field:asc" or "field:desc"', () => {
      expect(
        paginationQuerySchema.safeParse({ sort: 'createdAt:desc' }).success,
      ).toBe(true);
      expect(
        paginationQuerySchema.safeParse({ sort: 'name:asc' }).success,
      ).toBe(true);
      expect(paginationQuerySchema.safeParse({ sort: 'invalid' }).success).toBe(
        false,
      );
    });
  });

  describe('idParamSchema', () => {
    it('accepts valid UUIDs', () => {
      expect(
        idParamSchema.safeParse({ id: '123e4567-e89b-12d3-a456-426614174000' })
          .success,
      ).toBe(true);
    });

    it('rejects non-UUID strings', () => {
      expect(idParamSchema.safeParse({ id: '12345' }).success).toBe(false);
    });
  });

  describe('emailSchema', () => {
    it('trims and lowercases emails', () => {
      const parsed = emailSchema.parse('  User@Brightloop.local  ');
      expect(parsed).toBe('user@brightloop.local');
    });

    it('rejects invalid email formats', () => {
      expect(emailSchema.safeParse('not-an-email').success).toBe(false);
    });
  });

  describe('moneyStringSchema and dateStringSchema', () => {
    it('validates money string format', () => {
      expect(moneyStringSchema.safeParse('1560.00').success).toBe(true);
      expect(moneyStringSchema.safeParse('0.00').success).toBe(true);
      expect(moneyStringSchema.safeParse('100').success).toBe(true);
      expect(moneyStringSchema.safeParse('-50.50').success).toBe(true);
      expect(moneyStringSchema.safeParse('100.555').success).toBe(false);
    });

    it('validates YYYY-MM-DD date format', () => {
      expect(dateStringSchema.safeParse('2026-10-31').success).toBe(true);
      expect(dateStringSchema.safeParse('31-10-2026').success).toBe(false);
      expect(dateStringSchema.safeParse('2026/10/31').success).toBe(false);
    });
  });
});
