import { Decimal } from 'decimal.js';

// Configure standard precision and ROUND_HALF_UP rounding
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

/**
 * Create a new Decimal instance.
 */
export function d(value: Decimal.Value): Decimal {
  return new Decimal(value);
}

/**
 * Round a monetary value to 2 decimal places using ROUND_HALF_UP.
 */
export function round2(value: Decimal.Value): Decimal {
  return d(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Sum an array of monetary values.
 */
export function sum(values: (Decimal.Value | null | undefined)[]): Decimal {
  return values.reduce<Decimal>((acc, val) => {
    if (val === null || val === undefined) return acc;
    return acc.plus(d(val));
  }, d(0));
}

/**
 * Format a monetary value to a 2-decimal string (e.g. "1560.00").
 */
export function toMoneyString(value: Decimal.Value): string {
  return round2(value).toFixed(2);
}

/**
 * Multiply two numbers and round to 2 decimal places with ROUND_HALF_UP.
 */
export function multiplyMoney(a: Decimal.Value, b: Decimal.Value): Decimal {
  return round2(d(a).times(d(b)));
}
