import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '../lib/api-client';
import { Button } from '../components/ui/button';
import { Money } from '../components/money';
import { type Row, type Page, text } from './resource-page';
export function RecordState({
  loading,
  error,
}: {
  loading: boolean;
  error?: Error | null;
}) {
  return loading ? (
    <div role="status" className="space-y-4">
      <div className="h-8 animate-pulse rounded bg-muted" />
      <div className="h-40 animate-pulse rounded bg-muted" />
    </div>
  ) : error ? (
    <p role="alert" className="rounded-lg border border-danger p-6 text-danger">
      {error.message}
    </p>
  ) : null;
}
export function EntitySelect({
  endpoint,
  name,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
}: {
  endpoint: string;
  name: string;
  label: string;
  value?: string;
  onChange?: (id: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const [q, setQ] = useState('');
  const query = useQuery({
    queryKey: [endpoint, 'picker', q],
    queryFn: () =>
      apiClient<Page<Row>>(
        `${endpoint}?pageSize=25&q=${encodeURIComponent(q)}`,
      ),
  });
  return (
    <div>
      <label
        htmlFor={`${name}-search`}
        className="text-xs text-muted-foreground"
      >
        Search {label.toLowerCase()}
      </label>
      <input
        id={`${name}-search`}
        className="input mt-1 mb-2"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        disabled={disabled}
      />
      <label className="block">
        {label}
        <select
          className="input mt-2"
          name={name}
          required={required}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          disabled={disabled}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {query.data?.data.map((row) => (
            <option key={row.id} value={row.id}>
              {text(
                row.name ?? (row.user as Row | undefined)?.name ?? row.number,
              )}
              {row.price ? ` · ${text(row.price)}` : ''}
            </option>
          ))}
        </select>
      </label>
      {query.error && (
        <p role="alert" className="text-xs text-danger">
          {query.error.message}
        </p>
      )}
    </div>
  );
}
export function ActionButton({
  endpoint,
  action,
  label,
  reason = false,
  onDone,
}: {
  endpoint: string;
  action: string;
  label: string;
  reason?: boolean;
  onDone?: () => void;
}) {
  const [pending, setPending] = useState(false);
  const client = useQueryClient();
  return (
    <Button
      variant={reason ? 'outline' : 'default'}
      disabled={pending}
      onClick={async () => {
        let explanation: string | null = null;
        if (reason) {
          explanation = window.prompt(`${label}: enter a reason`);
          if (!explanation?.trim()) return;
          if (!window.confirm(`Confirm ${label.toLowerCase()}?`)) return;
        }
        setPending(true);
        try {
          await apiClient(`${endpoint}/${action}`, {
            method: 'POST',
            body: JSON.stringify(explanation ? { reason: explanation } : {}),
          });
          toast.success(`${label} completed`);
          await client.invalidateQueries();
          onDone?.();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Action failed');
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? 'Working…' : label}
    </Button>
  );
}
export function Totals({ record }: { record: Row }) {
  return (
    <dl className="ml-auto max-w-sm space-y-3 p-6">
      {[
        ['subtotal', 'Subtotal'],
        ['discountTotal', 'Discounts'],
        ['taxTotal', 'Taxes'],
        ['total', 'Total'],
        ['amountPaid', 'Paid'],
        ['amountDue', 'Amount due'],
      ]
        .filter(([key]) => key && record[key] != null)
        .map(([key, label]) => (
          <div key={key} className="flex justify-between gap-8">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-semibold">
              <Money value={text(record[key!])} />
            </dd>
          </div>
        ))}
    </dl>
  );
}
export async function downloadPdf(path: string) {
  // Obtain the PDF through the authenticated API client rather than a bare link.
  const result = await apiClient<Blob>(path, {
    headers: { Accept: 'application/pdf' },
  });
  const url = URL.createObjectURL(result);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'invoice.pdf';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
