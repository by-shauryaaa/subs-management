import { describe, expect, it } from 'vitest';
import {
  todayInTz,
  addPeriods,
  periodStart,
  periodEnd,
  periodDisplayEnd,
  formatDate,
} from './dates.js';
import { BillingPeriod } from './enums.js';

describe('date utilities', () => {
  describe('todayInTz()', () => {
    it('returns a valid YYYY-MM-DD date string', () => {
      const today = todayInTz('Asia/Kolkata');
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('addPeriods() and periodStart()', () => {
    it('handles DAILY billing period', () => {
      expect(addPeriods('2026-01-01', BillingPeriod.DAILY, 1)).toBe(
        '2026-01-02',
      );
      expect(periodStart('2026-01-01', BillingPeriod.DAILY, 0)).toBe(
        '2026-01-01',
      );
      expect(periodStart('2026-01-01', BillingPeriod.DAILY, 1)).toBe(
        '2026-01-02',
      );
      expect(periodStart('2026-01-01', BillingPeriod.DAILY, 30)).toBe(
        '2026-01-31',
      );
    });

    it('handles WEEKLY billing period', () => {
      expect(periodStart('2026-01-01', BillingPeriod.WEEKLY, 0)).toBe(
        '2026-01-01',
      );
      expect(periodStart('2026-01-01', BillingPeriod.WEEKLY, 1)).toBe(
        '2026-01-08',
      );
      expect(periodStart('2026-01-01', BillingPeriod.WEEKLY, 4)).toBe(
        '2026-01-29',
      );
    });

    it('handles MONTHLY billing period with regular days', () => {
      expect(periodStart('2026-01-15', BillingPeriod.MONTHLY, 0)).toBe(
        '2026-01-15',
      );
      expect(periodStart('2026-01-15', BillingPeriod.MONTHLY, 1)).toBe(
        '2026-02-15',
      );
      expect(periodStart('2026-01-15', BillingPeriod.MONTHLY, 12)).toBe(
        '2027-01-15',
      );
    });

    it('handles YEARLY billing period', () => {
      expect(periodStart('2026-05-10', BillingPeriod.YEARLY, 0)).toBe(
        '2026-05-10',
      );
      expect(periodStart('2026-05-10', BillingPeriod.YEARLY, 1)).toBe(
        '2027-05-10',
      );
    });
  });

  describe('month-end clamping and anchor drift prevention (31st-of-month and leap year)', () => {
    it('anchors on Jan 31 in a leap year (2024), clamps Feb to 29 and recovers to 31 in March', () => {
      const anchor = '2024-01-31';

      expect(periodStart(anchor, BillingPeriod.MONTHLY, 0)).toBe('2024-01-31');
      // Feb in 2024 has 29 days
      expect(periodStart(anchor, BillingPeriod.MONTHLY, 1)).toBe('2024-02-29');
      // March has 31 days - must NOT drift to March 29
      expect(periodStart(anchor, BillingPeriod.MONTHLY, 2)).toBe('2024-03-31');
      // April has 30 days
      expect(periodStart(anchor, BillingPeriod.MONTHLY, 3)).toBe('2024-04-30');
      // May has 31 days
      expect(periodStart(anchor, BillingPeriod.MONTHLY, 4)).toBe('2024-05-31');
    });

    it('anchors on Jan 31 in a non-leap year (2025), clamps Feb to 28 and recovers to 31 in March', () => {
      const anchor = '2025-01-31';

      expect(periodStart(anchor, BillingPeriod.MONTHLY, 0)).toBe('2025-01-31');
      // Feb in 2025 has 28 days
      expect(periodStart(anchor, BillingPeriod.MONTHLY, 1)).toBe('2025-02-28');
      // March has 31 days - must NOT drift to March 28
      expect(periodStart(anchor, BillingPeriod.MONTHLY, 2)).toBe('2025-03-31');
    });

    it('handles yearly renewal from leap day (2024-02-29)', () => {
      const leapDay = '2024-02-29';
      expect(periodStart(leapDay, BillingPeriod.YEARLY, 1)).toBe('2025-02-28');
      expect(periodStart(leapDay, BillingPeriod.YEARLY, 4)).toBe('2028-02-29');
    });
  });

  describe('periodEnd() and periodDisplayEnd()', () => {
    it('computes exclusive periodEnd and inclusive periodDisplayEnd', () => {
      const anchor = '2026-01-01';
      // Period 0: [2026-01-01, 2026-02-01)
      expect(periodStart(anchor, BillingPeriod.MONTHLY, 0)).toBe('2026-01-01');
      expect(periodEnd(anchor, BillingPeriod.MONTHLY, 0)).toBe('2026-02-01');
      expect(periodDisplayEnd(anchor, BillingPeriod.MONTHLY, 0)).toBe(
        '2026-01-31',
      );
    });
  });

  describe('formatDate()', () => {
    it('formats YYYY-MM-DD into D MMM YYYY per DESIGN.md', () => {
      expect(formatDate('2026-10-31')).toBe('31 Oct 2026');
      expect(formatDate('2026-01-05')).toBe('5 Jan 2026');
    });
  });
});
