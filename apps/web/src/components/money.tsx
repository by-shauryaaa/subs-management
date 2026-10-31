export function Money({
  value,
  currency = 'INR',
}: {
  value: string;
  currency?: string;
}) {
  if (!/^-?\d+(\.\d{1,2})?$/.test(value))
    return <span aria-label="Amount unavailable">—</span>;
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value as unknown as number);
  return <span className="whitespace-nowrap tabular-nums">{formatted}</span>;
}
