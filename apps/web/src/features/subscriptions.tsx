import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { apiClient } from '../lib/api-client';
import { DataTable } from '../components/data-table/data-table';
import { useTableParams } from '../components/data-table/use-table-params';
import { PageHeader } from '../components/layout/page-header';
import { StatusBadge } from '../components/status-badge';
import { Button } from '../components/ui/button';
import { formatDate } from '../lib/format-date';
import { type Row, type Page, text } from './resource-page';
import {
  ActionButton,
  EntitySelect,
  RecordState,
  Totals,
} from './record-tools';
const statuses = [
  'DRAFT',
  'QUOTATION',
  'CONFIRMED',
  'ACTIVE',
  'PAUSED',
  'CLOSED',
];
export function SubscriptionList({ portal = false }: { portal?: boolean }) {
  const { params, update } = useTableParams();
  const endpoint = `${portal ? '/portal' : ''}/subscriptions`;
  const query = useQuery({
    queryKey: [endpoint, params.toString()],
    queryFn: () => apiClient<Page<Row>>(`${endpoint}?${params}`),
  });
  return (
    <>
      <PageHeader
        title="Subscriptions"
        description="Every customer journey, from first quote to next renewal."
        actions={
          !portal && (
            <Button asChild>
              <Link to="/app/subscriptions/new">New subscription</Link>
            </Button>
          )
        }
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant={!params.get('status') ? 'default' : 'outline'}
          onClick={() => update({ status: null, page: 1 })}
        >
          All
        </Button>
        {statuses.map((status) => (
          <Button
            key={status}
            variant={params.get('status') === status ? 'default' : 'outline'}
            onClick={() => update({ status, page: 1 })}
          >
            {status.charAt(0) + status.slice(1).toLowerCase()}
            {query.data?.meta.counts?.[status] != null
              ? ` · ${query.data.meta.counts[status]}`
              : ''}
          </Button>
        ))}
      </div>
      <DataTable
        columns={[
          {
            accessorKey: 'number',
            header: 'Subscription',
            cell: ({ row }) => (
              <Link
                className="font-mono text-primary"
                to={`${portal ? '/portal' : '/app'}/subscriptions/${row.original.id}`}
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
            accessorKey: 'plan',
            header: 'Plan',
            cell: ({ getValue }) => text(getValue()),
          },
          {
            accessorKey: 'nextBillingDate',
            header: 'Next billing',
            cell: ({ getValue }) => formatDate(text(getValue())),
          },
          {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ getValue }) => <StatusBadge status={text(getValue())} />,
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
interface Line {
  variantId: string;
  description: string;
  quantity: number;
  unitPrice: string;
  taxIds: string[];
}
export function SubscriptionForm() {
  const navigate = useNavigate();
  const [lines, setLines] = useState<Line[]>([
    {
      variantId: '',
      description: '',
      quantity: 1,
      unitPrice: '0.00',
      taxIds: [],
    },
  ]);
  const [planId, setPlanId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const plan = useQuery({
    queryKey: ['/plans', planId],
    queryFn: () => apiClient<Row>(`/plans/${planId}`),
    enabled: !!planId,
  });
  function changeLine(index: number, patch: Partial<Line>) {
    setLines((previous) =>
      previous.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  }
  return (
    <>
      <PageHeader
        title="New subscription"
        description="Start a new recurring relationship."
      />
      <form
        className="space-y-6"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const body = {
            customerId: form.get('customerId'),
            planId,
            paymentTermId: form.get('paymentTermId'),
            startDate: form.get('startDate'),
            expiryDate: form.get('expiryDate') || null,
            notes: form.get('notes'),
            lines,
          };
          setSaving(true);
          setError('');
          try {
            const result = await apiClient<Row>('/subscriptions', {
              method: 'POST',
              body: JSON.stringify(body),
            });
            toast.success('Subscription created');
            navigate(`/app/subscriptions/${result.id}`);
          } catch (failure) {
            setError(
              failure instanceof Error ? failure.message : 'Unable to save',
            );
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="grid gap-6 rounded-lg border border-border bg-surface p-6 md:grid-cols-3">
          <EntitySelect
            endpoint="/customers"
            name="customerId"
            label="Customer"
            required
          />
          <EntitySelect
            endpoint="/plans"
            name="planId"
            label="Plan"
            value={planId}
            onChange={setPlanId}
            required
          />
          <EntitySelect
            endpoint="/payment-terms"
            name="paymentTermId"
            label="Payment term"
            required
          />
          <label>
            Start date
            <input
              name="startDate"
              className="input mt-2"
              type="date"
              required
            />
          </label>
          <label>
            Expiry date
            <input name="expiryDate" className="input mt-2" type="date" />
          </label>
        </div>
        <section className="space-y-4 rounded-lg border border-border bg-surface p-6">
          <h2 className="font-heading text-xl font-semibold">
            Subscription lines
          </h2>
          {plan.data && Number(plan.data.price) > 0 && (
            <p className="rounded bg-muted p-4">
              🔒 {text(plan.data.name)} — base fee · {text(plan.data.price)} per
              period (added by billing)
            </p>
          )}
          {lines.map((line, index) => (
            <fieldset
              key={index}
              className="grid gap-4 border-b border-border py-4 md:grid-cols-4"
            >
              <legend className="text-xs text-muted-foreground">
                Line {index + 1}
              </legend>
              <EntitySelect
                endpoint="/variants"
                name={`variant-${index}`}
                label="Variant"
                value={line.variantId}
                required
                onChange={(variantId) => changeLine(index, { variantId })}
              />
              <label>
                Description
                <input
                  className="input mt-2"
                  value={line.description}
                  required
                  onChange={(event) =>
                    changeLine(index, { description: event.target.value })
                  }
                />
              </label>
              <label>
                Quantity
                <input
                  className="input mt-2"
                  type="number"
                  min={Number(plan.data?.minQuantity ?? 1)}
                  step="1"
                  required
                  value={line.quantity}
                  onChange={(event) =>
                    changeLine(index, { quantity: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                Unit price
                <input
                  className="input mt-2"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={line.unitPrice}
                  onChange={(event) =>
                    changeLine(index, { unitPrice: event.target.value })
                  }
                />
              </label>
              <Button
                variant="ghost"
                type="button"
                disabled={lines.length === 1}
                onClick={() =>
                  setLines((previous) => previous.filter((_, i) => i !== index))
                }
              >
                Remove line
              </Button>
            </fieldset>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setLines((previous) => [
                ...previous,
                {
                  variantId: '',
                  description: '',
                  quantity: Number(plan.data?.minQuantity ?? 1),
                  unitPrice: '0.00',
                  taxIds: [],
                },
              ])
            }
          >
            Add line
          </Button>
          <p className="text-xs text-muted-foreground">
            Final pricing and taxes are validated by the server when saved.
          </p>
        </section>
        <label className="block">
          Notes
          <textarea name="notes" className="input mt-2 h-24 py-3" />
        </label>
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <Button disabled={saving}>
          {saving ? 'Saving…' : 'Create subscription'}
        </Button>
      </form>
    </>
  );
}
export function SubscriptionDetail({ portal = false }: { portal?: boolean }) {
  const { id } = useParams();
  const endpoint = `${portal ? '/portal' : ''}/subscriptions/${id}`;
  const [tab, setTab] = useState('Lines');
  const query = useQuery({
    queryKey: [endpoint],
    queryFn: () => apiClient<Row>(endpoint),
  });
  const history = useQuery({
    queryKey: [endpoint, 'history'],
    queryFn: () => apiClient<Row[]>(`${endpoint}/history`),
    enabled: !portal && tab === 'History',
  });
  const invoices = useQuery({
    queryKey: [endpoint, 'invoices'],
    queryFn: () =>
      apiClient<Page<Row>>(
        `${portal ? '/portal' : ''}/invoices?subscriptionId=${id}`,
      ),
    enabled: tab === 'Invoices',
  });
  const record = query.data;
  if (!record)
    return <RecordState loading={query.isPending} error={query.error} />;
  // Shared state-machine exports are not yet available. Only server-supplied actions are actionable.
  const actions = Array.isArray(record.allowedActions)
    ? record.allowedActions.filter(
        (action): action is string => typeof action === 'string',
      )
    : [];
  const lines = Array.isArray(record.lines) ? (record.lines as Row[]) : [];
  return (
    <>
      <PageHeader
        title={text(record.number)}
        description={`${text(record.customer)} · ${text(record.plan)}`}
        actions={actions.map((action) => (
          <ActionButton
            key={action}
            endpoint={endpoint}
            action={action}
            label={action.charAt(0).toUpperCase() + action.slice(1)}
            reason={['close', 'cancel', 'decline'].includes(action)}
          />
        ))}
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {statuses
          .filter((status) => status !== 'PAUSED')
          .map((status) => (
            <span
              key={status}
              className={
                record.status === status
                  ? 'rounded-full bg-primary px-4 py-2 text-primary-foreground'
                  : 'px-3 py-2 text-muted-foreground'
              }
            >
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </span>
          ))}
        {record.status === 'PAUSED' && <StatusBadge status="PAUSED" />}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-surface p-6 lg:col-span-2">
          <div className="mb-6 flex gap-3" role="tablist">
            {['Lines', 'Invoices', ...(!portal ? ['History'] : [])].map(
              (label) => (
                <Button
                  key={label}
                  role="tab"
                  aria-selected={tab === label}
                  variant={tab === label ? 'default' : 'ghost'}
                  onClick={() => setTab(label)}
                >
                  {label}
                </Button>
              ),
            )}
          </div>
          {tab === 'Lines' && (
            <div className="space-y-4">
              {lines.map((line, index) => (
                <div
                  key={line.id ?? index}
                  className="flex flex-wrap justify-between gap-3 border-b border-border pb-4"
                >
                  <span>
                    {line.isPlanFee ? '🔒 ' : ''}
                    {text(line.description)}
                  </span>
                  <span>
                    {text(line.quantity)} × {text(line.unitPrice)}
                  </span>
                </div>
              ))}
              <Totals record={record} />
            </div>
          )}
          {tab === 'Invoices' && (
            <>
              <RecordState
                loading={invoices.isPending}
                error={invoices.error}
              />
              {invoices.data?.data.map((invoice) => (
                <Link
                  key={invoice.id}
                  className="flex justify-between border-b border-border py-4"
                  to={`${portal ? '/portal' : '/app'}/invoices/${invoice.id}`}
                >
                  <span>{text(invoice.number)}</span>
                  <StatusBadge entity="invoice" status={text(invoice.status)} />
                </Link>
              ))}
            </>
          )}
          {tab === 'History' && (
            <>
              <RecordState loading={history.isPending} error={history.error} />
              {history.data?.map((item) => (
                <p key={item.id} className="border-l border-border pb-6 pl-4">
                  {text(item.actor)} · {text(item.action)}
                  <span className="mt-2 block text-xs text-muted-foreground">
                    {formatDate(text(item.createdAt))}
                  </span>
                </p>
              ))}
            </>
          )}
        </section>
        <aside className="space-y-6">
          <div className="space-y-4 rounded-xl border border-border bg-surface p-6">
            <h2 className="font-heading text-xl">Subscription details</h2>
            {['startDate', 'expiryDate', 'nextBillingDate'].map((key) => (
              <div key={key}>
                <p className="text-xs text-muted-foreground">
                  {key.replace(/([A-Z])/g, ' $1')}
                </p>
                <p>{formatDate(text(record[key]))}</p>
              </div>
            ))}
            <StatusBadge status={text(record.status)} />
          </div>
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="mb-4 font-heading text-xl">Discounts</h2>
            {Array.isArray(record.discounts) && record.discounts.length ? (
              (record.discounts as Row[]).map((discount) => (
                <p key={discount.id}>
                  {text(discount.name ?? discount.discount)}
                </p>
              ))
            ) : (
              <p className="text-muted-foreground">No discounts attached.</p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
