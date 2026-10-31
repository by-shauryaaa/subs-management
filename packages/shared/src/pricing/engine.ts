import { d, round2, sum, toMoneyString } from '../money.js';

export interface PricingLineInput {
  quantity: number;
  unitPrice: string;
  taxes: { id: string; name: string; rate: string }[];
}

export interface PricedLine {
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  total: string;
  taxes: { taxId: string; name: string; rate: string; amount: string }[];
}

export interface PricingResult {
  lines: PricedLine[];
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
}

/**
 * Prices a document: per line, subtotal = qty × unit price (rounded half-up),
 * each tax = subtotal × rate% (rounded per tax), total = subtotal + taxes.
 * Pure and deterministic; discounts are applied by the caller (P5-02).
 */
export function priceDocument(lines: PricingLineInput[]): PricingResult {
  const priced = lines.map((line): PricedLine => {
    const subtotal = round2(d(line.unitPrice).times(line.quantity));
    const taxes = line.taxes.map((tax) => ({
      taxId: tax.id,
      name: tax.name,
      rate: d(tax.rate).toFixed(2),
      amount: toMoneyString(subtotal.times(tax.rate).dividedBy(100)),
    }));
    const taxAmount = sum(taxes.map((t) => t.amount));
    return {
      subtotal: subtotal.toFixed(2),
      discountAmount: '0.00',
      taxAmount: taxAmount.toFixed(2),
      total: toMoneyString(subtotal.plus(taxAmount)),
      taxes,
    };
  });
  return {
    lines: priced,
    subtotal: toMoneyString(sum(priced.map((l) => l.subtotal))),
    discountTotal: '0.00',
    taxTotal: toMoneyString(sum(priced.map((l) => l.taxAmount))),
    total: toMoneyString(sum(priced.map((l) => l.total))),
  };
}
