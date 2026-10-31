import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { apiClient } from '../lib/api-client';
import { PageHeader } from '../components/layout/page-header';
import { DataTable } from '../components/data-table/data-table';
import { useTableParams } from '../components/data-table/use-table-params';
import { StatusBadge } from '../components/status-badge';
import { Money } from '../components/money';
import { Button } from '../components/ui/button';
import { formatDate } from '../lib/format-date';
import { type Row, type Page, text } from './resource-page';
import { ActionButton, RecordState, Totals, downloadPdf } from './record-tools';
export function PaymentForm({
  invoiceId,
  onDone,
}: {
  invoiceId: string;
  onDone?: () => void;
}) {
  const client = useQueryClient();
  const [pending, setPending] = useState(false);
  return (
    <form
      className="grid gap-4 rounded-lg border border-border bg-surface p-6 sm:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setPending(true);
        try {
          await apiClient(`/invoices/${invoiceId}/payments`, {
            method: 'POST',
            body: JSON.stringify(Object.fromEntries(form)),
          });
          toast.success('Payment recorded');
          await client.invalidateQueries();
          onDone?.();
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : 'Payment failed',
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <h2 className="font-heading text-xl font-semibold sm:col-span-2">
        Record payment
      </h2>
      <label>
        Amount
        <input
          className="input mt-2"
          name="amount"
          type="number"
          required
          min="0.01"
          step="0.01"
        />
      </label>
      <label>
        Payment date
        <input className="input mt-2" name="paymentDate" type="date" required />
      </label>
      <label>
        Method
        <select className="input mt-2" name="method">
          {['BANK_TRANSFER', 'UPI', 'CARD', 'CASH', 'CHEQUE', 'OTHER'].map(
            (method) => (
              <option key={method}>{method}</option>
            ),
          )}
        </select>
      </label>
      <label>
        Reference
        <input className="input mt-2" name="reference" />
      </label>
      <Button disabled={pending}>
        {pending ? 'Recording…' : 'Record payment'}
      </Button>
    </form>
  );
}
export function InvoiceList({ portal = false }: { portal?: boolean }) {
  const { params, update } = useTableParams();
  const endpoint = portal ? '/portal/invoices' : '/invoices';
  const client = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const query = useQuery({
    queryKey: [endpoint, params.toString()],
    queryFn: () => apiClient<Page<Row>>(`${endpoint}?${params}`),
  });
  return (
    <>
      <PageHeader
        title="Invoices"
        description="Every billing cycle. Every amount accounted for."
        actions={
          !portal &&
          selected.length > 0 && (
            <Button
              onClick={async () => {
                try {
                  await apiClient('/invoices/confirm-bulk', {
                    method: 'POST',
                    body: JSON.stringify({ ids: selected }),
                  });
                  setSelected([]);
                  await client.invalidateQueries();
                  toast.success('Invoices confirmed');
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : 'Unable to confirm',
                  );
                }
              }}
            >
              Confirm {selected.length} selected
            </Button>
          )
        }
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {['all', 'paid', 'outstanding', 'overdue'].map((view) => (
          <Button
            key={view}
            variant={
              (params.get('view') ?? 'all') === view ? 'default' : 'outline'
            }
            onClick={() =>
              update({ view: view === 'all' ? null : view, page: 1 })
            }
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </Button>
        ))}
      </div>
      <DataTable
        columns={[
          ...(!portal
            ? [
                {
                  id: 'select',
                  header: 'Select',
                  enableSorting: false,
                  cell: ({ row }: { row: { original: Row } }) =>
                    row.original.status === 'DRAFT' ? (
                      <input
                        type="checkbox"
                        aria-label={`Select ${text(row.original.number)}`}
                        checked={selected.includes(row.original.id)}
                        onChange={(event) =>
                          setSelected((previous) =>
                            event.target.checked
                              ? [...previous, row.original.id]
                              : previous.filter((id) => id !== row.original.id),
                          )
                        }
                      />
                    ) : null,
                },
              ]
            : []),
          {
            accessorKey: 'number',
            header: 'Invoice',
            cell: ({ row }) => (
              <Link
                className="font-mono text-primary"
                to={`${portal ? '/portal' : '/app'}/invoices/${row.original.id}`}
              >
                {text(row.original.number)}
              </Link>
            ),
          },
          {
            accessorKey: 'customer',
            header: 'Customer',
            cell: ({ getValue }) => text(getValue()),
          },
          {
            accessorKey: 'dueDate',
            header: 'Due date',
            cell: ({ getValue }) => formatDate(text(getValue())),
          },
          {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => (
              <StatusBadge
                entity="invoice"
                status={text(row.original.status)}
                overdueDays={
                  typeof row.original.daysOverdue === 'number'
                    ? row.original.daysOverdue
                    : undefined
                }
              />
            ),
          },
          {
            accessorKey: 'total',
            header: 'Total',
            cell: ({ getValue }) => <Money value={text(getValue())} />,
          },
          {
            accessorKey: 'amountDue',
            header: 'Amount due',
            cell: ({ getValue }) => <Money value={text(getValue())} />,
          },
        ]}
        data={query.data?.data ?? []}
        total={query.data?.meta.total ?? 0}
        loading={query.isPending}
        error={query.error?.message}
        onRetry={() => {
          void query.refetch();
        }}
      />
    </>
  );
}
export function InvoiceDetail({ portal = false }: { portal?: boolean }) {
  const [search] = useSearchParams();
  const { id } = useParams();
  const endpoint = `${portal ? '/portal' : ''}/invoices/${id}`;
  const [payment, setPayment] = useState(search.get('payment') === '1');
  const query = useQuery({
    queryKey: [endpoint],
    queryFn: () => apiClient<Row>(endpoint),
  });
  const record = query.data;
  if (!record)
    return <RecordState loading={query.isPending} error={query.error} />;
  const lines = Array.isArray(record.lines) ? (record.lines as Row[]) : [];
  return (
    <>
      <PageHeader
        title={text(record.number)}
        description="Invoice detail"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                void downloadPdf(`${endpoint}/pdf`).catch((error) =>
                  toast.error(error.message),
                );
              }}
            >
              Download PDF
            </Button>
            {!portal && record.status === 'DRAFT' && (
              <ActionButton
                endpoint={endpoint}
                action="confirm"
                label="Confirm"
              />
            )}
            {!portal && ['CONFIRMED', 'PAID'].includes(text(record.status)) && (
              <ActionButton
                endpoint={endpoint}
                action="send"
                label="Send invoice"
              />
            )}
            {!portal && record.status === 'CONFIRMED' && (
              <Button onClick={() => setPayment(!payment)}>
                Record payment
              </Button>
            )}
            {!portal &&
              ['DRAFT', 'CONFIRMED'].includes(text(record.status)) &&
              Number(record.amountPaid ?? 0) === 0 && (
                <ActionButton
                  endpoint={endpoint}
                  action="cancel"
                  label="Cancel invoice"
                  reason
                />
              )}
            {!portal && record.status === 'CANCELLED' && (
              <ActionButton
                endpoint={endpoint}
                action="regenerate"
                label="Regenerate"
              />
            )}
          </>
        }
      />
      <article className="mx-auto max-w-4xl rounded-xl border border-border bg-surface p-6 md:p-8">
        <div className="flex flex-wrap justify-between gap-6 border-b border-border pb-6">
          <div>
            <p className="font-editorial text-3xl">Brightloop</p>
            <p className="mt-4 text-muted-foreground">Bill to</p>
            <p>{text(record.customerSnapshot ?? record.customer)}</p>
          </div>
          <div>
            <StatusBadge entity="invoice" status={text(record.status)} />
            <p className="mt-4">
              Invoice date: {formatDate(text(record.invoiceDate))}
            </p>
            <p>Due: {formatDate(text(record.dueDate))}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="mt-6 w-full text-left">
            <thead>
              <tr>
                {['Description', 'Quantity', 'Unit price', 'Total'].map(
                  (label) => (
                    <th className="p-3" key={label}>
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.id ?? index} className="border-t border-border">
                  <td className="p-3">{text(line.description)}</td>
                  <td className="p-3">{text(line.quantity)}</td>
                  <td className="p-3">
                    <Money value={text(line.unitPrice)} />
                  </td>
                  <td className="p-3">
                    <Money value={text(line.total ?? line.subtotal)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Totals record={record} />
        <h2 className="mt-6 font-semibold">Payments</h2>
        {Array.isArray(record.payments) && record.payments.length ? (
          (record.payments as Row[]).map((row) => (
            <div
              key={row.id}
              className="flex justify-between border-t border-border py-3"
            >
              <span>
                {text(row.method)} · {formatDate(text(row.paymentDate))}
              </span>
              <Money value={text(row.amount)} />
            </div>
          ))
        ) : (
          <p className="mt-3 text-muted-foreground">No payments recorded.</p>
        )}
      </article>
      {payment && (
        <div className="mt-6">
          <PaymentForm invoiceId={record.id} onDone={() => setPayment(false)} />
        </div>
      )}
    </>
  );
}
