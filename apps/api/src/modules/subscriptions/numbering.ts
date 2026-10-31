import type { Prisma } from '@prisma/client';

/**
 * Gap-free document numbers `PREFIX/YYYY/NNNNN` (e.g. INV/2026/00042).
 * The upsert row-locks the sequence until the surrounding transaction ends.
 */
export async function nextNumber(
  tx: Prisma.TransactionClient,
  prefix: 'SUB' | 'INV',
  year: string,
): Promise<string> {
  const key = `${prefix}-${year}`;
  const seq = await tx.sequence.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `${prefix}/${year}/${String(seq.value).padStart(5, '0')}`;
}

export const toDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
export const toIso = (date: Date) => date.toISOString().slice(0, 10);
