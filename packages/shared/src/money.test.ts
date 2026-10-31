import { describe, expect, it } from 'vitest';
import { d, round2, sum, toMoneyString, multiplyMoney } from './money.js';

describe('money utilities', () => {
  it('creates decimal instances via d()', () => {
    const val = d('100.50');
    expect(val.toFixed(2)).toBe('100.50');
    expect(val.isPositive()).toBe(true);
  });

  describe('round2() with half-up rounding', () => {
    it('rounds positive half-cents up', () => {
      expect(round2('1.005').toFixed(2)).toBe('1.01');
      expect(round2('1.0051').toFixed(2)).toBe('1.01');
      expect(round2('1.0049').toFixed(2)).toBe('1.00');
      expect(round2('1.004').toFixed(2)).toBe('1.00');
      expect(round2('1560.555').toFixed(2)).toBe('1560.56');
    });

    it('rounds negative half-cents away from zero (half-up rule)', () => {
      expect(round2('-1.005').toFixed(2)).toBe('-1.01');
      expect(round2('-1.004').toFixed(2)).toBe('-1.00');
    });

    it('preserves exact 2-decimal numbers', () => {
      expect(round2('10.25').toFixed(2)).toBe('10.25');
      expect(round2('0.00').toFixed(2)).toBe('0.00');
    });
  });

  describe('toMoneyString()', () => {
    it('formats values to exactly 2 decimal places', () => {
      expect(toMoneyString('1560')).toBe('1560.00');
      expect(toMoneyString(1560.5)).toBe('1560.50');
      expect(toMoneyString('0')).toBe('0.00');
      expect(toMoneyString('-50.2')).toBe('-50.20');
      expect(toMoneyString('100.005')).toBe('100.01');
    });
  });

  describe('sum()', () => {
    it('sums an array of monetary values accurately without float error', () => {
      // 0.1 + 0.2 is famously 0.30000000000000004 in IEEE-754 floats
      const result = sum(['0.10', '0.20']);
      expect(result.toFixed(2)).toBe('0.30');
    });

    it('handles empty arrays', () => {
      expect(sum([]).toFixed(2)).toBe('0.00');
    });

    it('filters out null and undefined values safely', () => {
      expect(sum(['100.00', null, '50.50', undefined]).toFixed(2)).toBe(
        '150.50',
      );
    });
  });

  describe('multiplyMoney()', () => {
    it('multiplies and rounds half-up to 2 decimals', () => {
      // 3 items @ 33.335 = 100.005 -> 100.01
      expect(multiplyMoney(3, '33.335').toFixed(2)).toBe('100.01');
      // 2 items @ 560 = 1120.00
      expect(multiplyMoney(2, '560').toFixed(2)).toBe('1120.00');
    });
  });
});
