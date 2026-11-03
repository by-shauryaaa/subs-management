import { Decimal, d, round2, sum, toMoneyString } from '../money.js';

export interface PricingLineInput {
  quantity: number;
  unitPrice: string;
  taxes: { id: string; name: string; rate: string }[];
  productId?: string | null;
  isPlanFee?: boolean;
}

export interface DiscountInput {
  id: string;
  name: string;
  type: 'FIXED' | 'PERCENTAGE';
  value: string;
  scope: 'PRODUCTS' | 'SUBSCRIPTION';
  productIds?: string[];
  minPurchase?: string | null;
  minQuantity?: number | null;
  startDate?: string;
  endDate?: string;
  usageLimit?: number | null;
  usageCount?: number;
  isActive?: boolean;
}

export interface PricedLine {
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  total: string;
  taxes: { taxId: string; name: string; rate: string; amount: string }[];
}

export interface AppliedDiscount {
  id: string;
  name: string;
  amount: string;
}

export interface PricingResult {
  lines: PricedLine[];
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  appliedDiscounts?: AppliedDiscount[];
}

/**
 * Prices a document per ARCHITECTURE.md §6.6:
 * 1. Line subtotal = qty × unit price, net = subtotal.
 * 2. Filter eligible discounts by active status, date range, and usage limits.
 * 3. Apply PRODUCTS-scoped discounts to matching lines.
 * 4. Apply SUBSCRIPTION-scoped discounts to remaining net, proportionally allocated.
 * 5. Compute line taxes on remaining net.
 * 6. Document totals: subtotal, discountTotal, taxTotal, total.
 */
export function priceDocument(
  lines: PricingLineInput[],
  discounts: DiscountInput[] = [],
  invoiceDate?: string,
): PricingResult {
  // Step 1: Initialize lines
  const working = lines.map((line) => {
    const subtotal = round2(d(line.unitPrice).times(line.quantity));
    return {
      line,
      subtotal,
      net: subtotal,
      discountAmount: d(0),
    };
  });

  const appliedDiscountsMap = new Map<string, { id: string; name: string; amount: Decimal }>();

  // Step 2: Filter eligible discounts
  const eligible = discounts.filter((disc) => {
    if (disc.isActive === false) return false;
    if (invoiceDate && disc.startDate && invoiceDate < disc.startDate) return false;
    if (invoiceDate && disc.endDate && invoiceDate > disc.endDate) return false;
    if (disc.usageLimit != null && (disc.usageCount ?? 0) >= disc.usageLimit) return false;
    return true;
  });

  // Step 3: PRODUCTS-scoped discounts
  for (const disc of eligible.filter((d) => d.scope === 'PRODUCTS')) {
    const targetProductIds = new Set(disc.productIds ?? []);
    const matching = working.filter(
      (w) => !w.line.isPlanFee && w.line.productId && targetProductIds.has(w.line.productId),
    );
    if (!matching.length) continue;

    const subtotalMatching = sum(matching.map((m) => m.subtotal));
    if (disc.minPurchase && subtotalMatching.lessThan(disc.minPurchase)) continue;

    let discountTotalForDisc = d(0);

    for (const item of matching) {
      if (disc.minQuantity && item.line.quantity < disc.minQuantity) continue;
      if (item.net.lessThanOrEqualTo(0)) continue;

      const amt =
        disc.type === 'PERCENTAGE'
          ? round2(item.net.times(disc.value).dividedBy(100))
          : Decimal.min(d(disc.value), item.net);

      if (amt.greaterThan(0)) {
        item.net = item.net.minus(amt);
        item.discountAmount = item.discountAmount.plus(amt);
        discountTotalForDisc = discountTotalForDisc.plus(amt);
      }
    }

    if (discountTotalForDisc.greaterThan(0)) {
      const prev = appliedDiscountsMap.get(disc.id);
      appliedDiscountsMap.set(disc.id, {
        id: disc.id,
        name: disc.name,
        amount: prev ? prev.amount.plus(discountTotalForDisc) : discountTotalForDisc,
      });
    }
  }

  // Step 4: SUBSCRIPTION-scoped discounts
  for (const disc of eligible.filter((d) => d.scope === 'SUBSCRIPTION')) {
    const nonPlanFeeQty = working
      .filter((w) => !w.line.isPlanFee)
      .reduce((acc, curr) => acc + curr.line.quantity, 0);

    if (disc.minQuantity && nonPlanFeeQty < disc.minQuantity) continue;

    const totalSubtotal = sum(working.map((w) => w.subtotal));
    if (disc.minPurchase && totalSubtotal.lessThan(disc.minPurchase)) continue;

    const currentBase = sum(working.map((w) => w.net));
    if (currentBase.lessThanOrEqualTo(0)) continue;

    const totalDiscountAmt =
      disc.type === 'PERCENTAGE'
        ? round2(currentBase.times(disc.value).dividedBy(100))
        : Decimal.min(d(disc.value), currentBase);

    if (totalDiscountAmt.greaterThan(0)) {
      // Allocate proportionally across lines by net
      let allocatedTotal = d(0);
      let maxNetIndex = 0;
      let maxNetValue = d(-1);

      const allocations = working.map((item, idx) => {
        if (item.net.greaterThan(maxNetValue)) {
          maxNetValue = item.net;
          maxNetIndex = idx;
        }
        if (item.net.lessThanOrEqualTo(0)) return d(0);
        const lineDiscount = round2(totalDiscountAmt.times(item.net).dividedBy(currentBase));
        allocatedTotal = allocatedTotal.plus(lineDiscount);
        return lineDiscount;
      });

      // Rounding remainder to line with largest net
      const remainder = totalDiscountAmt.minus(allocatedTotal);
      if (!remainder.isZero() && maxNetIndex >= 0 && allocations[maxNetIndex]) {
        allocations[maxNetIndex] = allocations[maxNetIndex]!.plus(remainder);
      }

      // Apply to lines
      working.forEach((item, idx) => {
        const alloc = allocations[idx] ?? d(0);
        const lineAmt = Decimal.min(alloc, item.net);
        item.net = item.net.minus(lineAmt);
        item.discountAmount = item.discountAmount.plus(lineAmt);
      });

      const prev = appliedDiscountsMap.get(disc.id);
      appliedDiscountsMap.set(disc.id, {
        id: disc.id,
        name: disc.name,
        amount: prev ? prev.amount.plus(totalDiscountAmt) : totalDiscountAmt,
      });
    }
  }

  // Step 5: Compute taxes on remaining net
  const pricedLines = working.map(({ line, subtotal, net, discountAmount }): PricedLine => {
    const taxes = line.taxes.map((tax) => ({
      taxId: tax.id,
      name: tax.name,
      rate: d(tax.rate).toFixed(2),
      amount: toMoneyString(net.times(tax.rate).dividedBy(100)),
    }));
    const taxAmount = sum(taxes.map((t) => t.amount));
    return {
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: toMoneyString(net.plus(taxAmount)),
      taxes,
    };
  });

  const subtotalTotal = sum(pricedLines.map((l) => l.subtotal));
  const discountTotal = sum(working.map((w) => w.discountAmount));
  const taxTotal = sum(pricedLines.map((l) => l.taxAmount));
  const grandTotal = sum(pricedLines.map((l) => l.total));

  return {
    lines: pricedLines,
    subtotal: toMoneyString(subtotalTotal),
    discountTotal: toMoneyString(discountTotal),
    taxTotal: toMoneyString(taxTotal),
    total: toMoneyString(grandTotal),
    appliedDiscounts: Array.from(appliedDiscountsMap.values()).map((ad) => ({
      id: ad.id,
      name: ad.name,
      amount: toMoneyString(ad.amount),
    })),
  };
}
