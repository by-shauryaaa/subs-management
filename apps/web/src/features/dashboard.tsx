import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { apiClient } from '../lib/api-client';
import { useTableParams } from '../components/data-table/use-table-params';
import { PageHeader } from '../components/layout/page-header';
import { DataTable } from '../components/data-table/data-table';
import { Money } from '../components/money';
import { Button } from '../components/ui/button';
import { type Row, type Page, text } from './resource-page';
import { EntitySelect, RecordState } from './record-tools';
import { formatDate } from '../lib/format-date';
export function Dashboard() {
  const { params, update } = useTableParams();
  const suffix = params.toString();
  const summary = useQuery({
    queryKey: ['/reports/summary', suffix],
    queryFn: () => apiClient<Row>(`/reports/summary?${suffix}`),
  });
  const revenue = useQuery({
    queryKey: ['/reports/revenue-series', suffix],
    queryFn: () => apiClient<Row[]>(`/reports/revenue-series?${suffix}`),
  });
  const statuses = useQuery({
    queryKey: ['/reports/subscriptions-by-status', suffix],
    queryFn: () =>
      apiClient<Row[]>(`/reports/subscriptions-by-status?${suffix}`),
  });
  const overdue = useQuery({
    queryKey: ['/reports/overdue', suffix],
    queryFn: () => apiClient<Page<Row>>(`/reports/overdue?${suffix}`),
  });
  return (
    <>
      <PageHeader
        title="Your business, in focus."
        description="A clearer picture of every recurring relationship."
      />
      <div className="mb-6 flex flex-wrap items-end gap-4">
        {[
          ['from', 'From'],
          ['to', 'To'],
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              className="input mt-2"
              type="date"
              value={params.get(key!) ?? ''}
              onChange={(event) =>
                update({ [key!]: event.target.value, page: 1 })
              }
            />
          </label>
        ))}
        <EntitySelect
          endpoint="/plans"
          name="plan-filter"
          label="Plan"
          value={params.get('planId') ?? ''}
          onChange={(id) => update({ planId: id, page: 1 })}
        />
        <EntitySelect
          endpoint="/customers"
          name="customer-filter"
          label="Customer"
          value={params.get('customerId') ?? ''}
          onChange={(id) => update({ customerId: id, page: 1 })}
        />
      </div>
      <RecordState loading={summary.isPending} error={summary.error} />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          ['activeSubscriptions', 'Active subscriptions'],
          ['mrr', 'MRR (list price)'],
          ['revenueCollected', 'Revenue collected'],
          ['invoiced', 'Invoiced'],
          ['outstanding', 'Outstanding'],
          ['overdueAmount', 'Overdue'],
        ].map(([key, label]) => (
          <div
            key={key}
            className="rounded-xl border border-border bg-surface p-6"
          >
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              {label}
            </p>
            <p className="mt-4 font-heading text-3xl font-semibold">
              {summary.data?.[key!] == null ? (
                '—'
              ) : key === 'activeSubscriptions' ? (
                text(summary.data[key])
              ) : (
                <Money value={text(summary.data[key!])} />
              )}
            </p>
          </div>
        ))}
      </div>
      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-surface p-6 lg:col-span-2">
          <h2 className="mb-6 font-heading text-xl">Revenue collected</h2>
          <RecordState loading={revenue.isPending} error={revenue.error} />
          {revenue.data && (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenue.data}>
                <XAxis dataKey="month" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                />
                <Bar
                  dataKey="amount"
                  fill="var(--accent)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
        <section className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-6 font-heading text-xl">Subscriptions by status</h2>
          <RecordState loading={statuses.isPending} error={statuses.error} />
          {statuses.data && (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={statuses.data} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  dataKey="status"
                  type="category"
                  width={100}
                  stroke="var(--text-muted)"
                />
                <Tooltip />
                <Bar dataKey="count" fill="var(--accent)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>
      <h2 className="mb-4 font-heading text-xl">Needs your attention</h2>
      <DataTable
        columns={[
          {
            accessorKey: 'number',
            header: 'Invoice',
            cell: ({ row }) => (
              <Link
                to={`/app/invoices/${row.original.id}`}
                className="font-mono text-primary"
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
          { accessorKey: 'daysOverdue', header: 'Days overdue' },
          {
            accessorKey: 'amountDue',
            header: 'Amount due',
            cell: ({ getValue }) => <Money value={text(getValue())} />,
          },
          {
            id: 'payment',
            header: 'Action',
            cell: ({ row }) => (
              <Button asChild variant="outline">
                <Link to={`/app/invoices/${row.original.id}?payment=1`}>
                  Record payment
                </Link>
              </Button>
            ),
          },
        ]}
        data={overdue.data?.data ?? []}
        total={overdue.data?.meta.total ?? 0}
        loading={overdue.isPending}
        error={overdue.error?.message}
      />
    </>
  );
}
