import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { BillingPeriod } from './enums.js';
import { DEFAULT_TIMEZONE } from './constants.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export { dayjs };

/**
 * Return today's date formatted as YYYY-MM-DD in the specified timezone.
 * Defaults to Asia/Kolkata.
 */
export function todayInTz(tz: string = DEFAULT_TIMEZONE): string {
  return dayjs().tz(tz).format('YYYY-MM-DD');
}

/**
 * Add a given number of periods to a date string (YYYY-MM-DD).
 * For monthly additions, dayjs clamps appropriately (e.g., Jan 31 -> Feb 28/29).
 */
export function addPeriods(
  startDate: string,
  period: BillingPeriod,
  count: number,
): string {
  const d = dayjs.utc(startDate);
  switch (period) {
    case BillingPeriod.DAILY:
      return d.add(count, 'day').format('YYYY-MM-DD');
    case BillingPeriod.WEEKLY:
      return d.add(count, 'week').format('YYYY-MM-DD');
    case BillingPeriod.MONTHLY:
      return d.add(count, 'month').format('YYYY-MM-DD');
    case BillingPeriod.YEARLY:
      return d.add(count, 'year').format('YYYY-MM-DD');
    default:
      throw new Error(`Unsupported billing period: ${String(period)}`);
  }
}

/**
 * Calculate the start of billing period index n, anchored on the original startDate.
 * Always computed from the anchor startDate (never adding to the previous period)
 * to avoid month-end date drift (ARCHITECTURE §6.4).
 */
export function periodStart(
  startDate: string,
  period: BillingPeriod,
  n: number,
): string {
  if (n === 0) {
    return dayjs.utc(startDate).format('YYYY-MM-DD');
  }
  return addPeriods(startDate, period, n);
}

/**
 * Calculate the exclusive end of billing period index n, which is periodStart(n + 1).
 */
export function periodEnd(
  startDate: string,
  period: BillingPeriod,
  n: number,
): string {
  return periodStart(startDate, period, n + 1);
}

/**
 * Calculate the inclusive display end date of a billing period (periodEnd minus 1 day).
 */
export function periodDisplayEnd(
  startDate: string,
  period: BillingPeriod,
  n: number,
): string {
  const end = periodEnd(startDate, period, n);
  return dayjs.utc(end).subtract(1, 'day').format('YYYY-MM-DD');
}

/**
 * Format a YYYY-MM-DD date into display format (e.g. "31 Oct 2026").
 */
export function formatDate(dateString: string): string {
  return dayjs.utc(dateString).format('D MMM YYYY');
}
