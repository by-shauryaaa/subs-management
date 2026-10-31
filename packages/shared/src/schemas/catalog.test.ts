import { describe, expect, it } from 'vitest';
import { createAttributeSchema } from './attributes.js';
import { createCustomerSchema, updateCustomerSchema } from './customers.js';
import {
  createProductSchema,
  createVariantSchema,
  nonNegativeMoneySchema,
} from './products.js';
import { updateUserSchema, userListQuerySchema } from './users.js';

describe('M1 module schemas', () => {
  it('normalises customer email and turns empty optional text into null', () => {
    const parsed = createCustomerSchema.parse({
      name: ' Asha ',
      email: ' Asha@Example.COM ',
      companyName: '  ',
      phone: '98765 43210',
    });
    expect(parsed).toEqual({
      name: 'Asha',
      email: 'asha@example.com',
      companyName: null,
      phone: '98765 43210',
    });
    expect(updateCustomerSchema.parse({})).toEqual({});
  });

  it('rejects negative or over-precise money and accepts zero', () => {
    expect(nonNegativeMoneySchema.safeParse('0').success).toBe(true);
    expect(nonNegativeMoneySchema.safeParse('1560.00').success).toBe(true);
    expect(nonNegativeMoneySchema.safeParse('-1.00').success).toBe(false);
    expect(nonNegativeMoneySchema.safeParse('1.005').success).toBe(false);
  });

  it('defaults product taxes and active flag', () => {
    const parsed = createProductSchema.parse({
      name: 'CRM seat',
      type: 'SERVICE',
      salesPrice: '1000.00',
      costPrice: '400.00',
    });
    expect(parsed.taxIds).toEqual([]);
    expect(parsed.isActive).toBe(true);
    expect(
      createProductSchema.safeParse({ ...parsed, type: 'OTHER' }).success,
    ).toBe(false);
  });

  it('requires at least one attribute value for a variant', () => {
    expect(
      createVariantSchema.safeParse({ attributeValueIds: [] }).success,
    ).toBe(false);
  });

  it('defaults attribute value price extras to zero', () => {
    expect(
      createAttributeSchema.parse({
        name: 'Brand',
        values: [{ name: 'Generic' }],
      }).values,
    ).toEqual([{ name: 'Generic', priceExtra: '0.00' }]);
  });

  it('parses user list filters from the query string', () => {
    expect(
      userListQuerySchema.parse({ role: 'STAFF', isActive: 'false' }),
    ).toMatchObject({ role: 'STAFF', isActive: false, page: 1, pageSize: 25 });
    expect(userListQuerySchema.safeParse({ isActive: 'yes' }).success).toBe(
      false,
    );
    expect(updateUserSchema.safeParse({ role: 'ADMIN' }).data).toEqual({});
  });
});
