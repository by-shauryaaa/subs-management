import { cn } from '../lib/utils';

const tones: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  QUOTATION: 'bg-info-soft text-info',
  CONFIRMED: 'bg-accent-soft text-accent-foreground',
  ACTIVE: 'bg-success-soft text-success',
  PAID: 'bg-success-soft text-success',
  PAUSED: 'bg-warning-soft text-warning',
  CLOSED: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-muted text-muted-foreground',
};
export function StatusBadge({
  status,
  entity = 'subscription',
  overdueDays,
  expired = false,
}: {
  status: string;
  entity?: 'subscription' | 'invoice';
  overdueDays?: number;
  expired?: boolean;
}) {
  let label = status.charAt(0) + status.slice(1).toLowerCase();
  let tone = tones[status] ?? tones.DRAFT;
  if (entity === 'invoice' && status === 'CONFIRMED') {
    label = 'Open';
    tone = 'bg-info-soft text-info';
  }
  if (
    entity === 'invoice' &&
    status === 'CONFIRMED' &&
    overdueDays &&
    overdueDays > 0
  ) {
    label = `Overdue · ${overdueDays} days`;
    tone = 'bg-danger-soft text-danger';
  }
  if (expired && status === 'QUOTATION') {
    label = 'Expired quote';
    tone = 'bg-warning-soft text-warning';
  }
  if (expired && status === 'ACTIVE') {
    label = 'Expired — action needed';
    tone = 'bg-warning-soft text-warning';
  }
  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center gap-2 rounded-full px-2 text-xs font-medium whitespace-nowrap',
        tone,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
