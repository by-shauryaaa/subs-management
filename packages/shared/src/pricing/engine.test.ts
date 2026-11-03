import { describe, expect, it } from 'vitest';
import {
  allowedActions,
  canTransition,
} from '../state/subscription-machine.js';
import { priceDocument } from './engine.js';

const gst18 = { id: 't18', name: 'GST 18%', rate: '18.00' };
const plan = { pausable: false, closable: true, renewable: true };

describe('priceDocument', () => {
  it('prices the 560 variant example with GST 18%', () => {
    const result = priceDocument([
      { quantity: 2, unitPrice: '1560.00', taxes: [gst18] },
    ]);
    expect(result).toMatchObject({
      subtotal: '3120.00',
      taxTotal: '561.60',
      total: '3681.60',
    });
  });

  it('applies multiple taxes per line and handles zero-price lines', () => {
    const result = priceDocument([
      {
        quantity: 1,
        unitPrice: '100.00',
        taxes: [gst18, { id: 't5', name: 'Cess', rate: '5' }],
      },
      { quantity: 3, unitPrice: '0', taxes: [gst18] },
    ]);
    expect(result.lines[0]!.taxes.map((t) => t.amount)).toEqual([
      '18.00',
      '5.00',
    ]);
    expect(result.lines[1]!.total).toBe('0.00');
    expect(result.total).toBe('123.00');
  });

  it('rounds half cents up', () => {
    expect(
      priceDocument([
        {
          quantity: 1,
          unitPrice: '0.05',
          taxes: [{ id: 'x', name: 'x', rate: '10' }],
        },
      ]).taxTotal,
    ).toBe('0.01');
  });

  it('applies percentage and fixed discounts at subscription and product scope', () => {
    const result = priceDocument(
      [
        {
          quantity: 2,
          unitPrice: '100.00',
          taxes: [gst18],
          productId: 'prod-1',
        },
        {
          quantity: 1,
          unitPrice: '200.00',
          taxes: [gst18],
          productId: 'prod-2',
        },
      ],
      [
        {
          id: 'disc-1',
          name: '10% off prod-1',
          type: 'PERCENTAGE',
          value: '10',
          scope: 'PRODUCTS',
          productIds: ['prod-1'],
        },
        {
          id: 'disc-2',
          name: 'Flat 50 off sub',
          type: 'FIXED',
          value: '50',
          scope: 'SUBSCRIPTION',
        },
      ],
    );

    expect(result.subtotal).toBe('400.00');
    expect(result.discountTotal).toBe('70.00');
    expect(result.appliedDiscounts?.length).toBe(2);
  });

  it('skips expired or used up discounts', () => {
    const result = priceDocument(
      [{ quantity: 1, unitPrice: '100.00', taxes: [] }],
      [
        {
          id: 'exp',
          name: 'Expired',
          type: 'FIXED',
          value: '20',
          scope: 'SUBSCRIPTION',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
        },
        {
          id: 'used',
          name: 'Used up',
          type: 'FIXED',
          value: '20',
          scope: 'SUBSCRIPTION',
          usageLimit: 1,
          usageCount: 1,
        },
      ],
      '2026-06-01',
    );
    expect(result.discountTotal).toBe('0.00');
    expect(result.total).toBe('100.00');
  });
});

describe('subscription machine', () => {
  it('lists allowed actions per status and plan flags', () => {
    expect(allowedActions('DRAFT', plan)).toEqual([
      'send',
      'confirm',
      'cancel',
    ]);
    expect(allowedActions('ACTIVE', plan)).toEqual(['close', 'renew']);
    expect(allowedActions('ACTIVE', { ...plan, pausable: true })).toContain(
      'pause',
    );
  });

  it('rejects forbidden combinations with specific codes', () => {
    expect(canTransition('DRAFT', 'activate', plan)).toEqual({
      ok: false,
      code: 'INVALID_TRANSITION',
    });
    expect(canTransition('ACTIVE', 'pause', plan)).toEqual({
      ok: false,
      code: 'PLAN_NOT_PAUSABLE',
    });
    expect(canTransition('ACTIVE', 'renew', plan, { renewed: true })).toEqual({
      ok: false,
      code: 'ALREADY_RENEWED',
    });
  });
});
