import { expect, test } from 'vitest';
import { isAvailable } from './resources';
test('plan availability includes both boundaries and open-ended windows', () => {
  expect(isAvailable({ isActive: true }, '2026-10-31')).toBe(true);
  const plan = {
    isActive: true,
    availableFrom: '2026-10-31',
    availableUntil: '2026-11-01',
  };
  expect(isAvailable(plan, '2026-10-31')).toBe(true);
  expect(isAvailable(plan, '2026-11-01')).toBe(true);
  expect(isAvailable(plan, '2026-10-30')).toBe(false);
  expect(isAvailable(plan, '2026-11-02')).toBe(false);
  expect(isAvailable({ ...plan, isActive: false }, '2026-10-31')).toBe(false);
});
