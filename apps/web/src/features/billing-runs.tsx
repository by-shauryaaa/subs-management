import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { PageHeader } from '../components/layout/page-header';
import { DataTable } from '../components/data-table/data-table';
import { useTableParams } from '../components/data-table/use-table-params';
import { ActionButton } from './record-tools';
import { type Page, type Row, text } from './resource-page';
import { formatDate } from '../lib/format-date';
export function BillingRuns() {
  const { params } = useTableParams();
  const query = useQuery({
    queryKey: ['/billing/runs', params.toString()],
    queryFn: () => apiClient<Page<Row>>(`/billing/runs?${params}`),
  });
  return (
    <>
      <PageHeader
        title="Billing runs"
        description="Every cycle processed. Every exception visible."
        actions={
          <ActionButton
            endpoint="/billing"
            action="run"
            label="Run billing now"
          />
        }
      />
      <DataTable
        columns={[
          {
            accessorKey: 'startedAt',
            header: 'Run date',
            cell: ({ getValue }) => formatDate(text(getValue())),
          },
          { accessorKey: 'trigger', header: 'Trigger' },
          { accessorKey: 'subscriptionsProcessed', header: 'Processed' },
          { accessorKey: 'invoicesCreated', header: 'Invoices created' },
          {
            accessorKey: 'failures',
            header: 'Failures',
            cell: ({ getValue }) =>
              Array.isArray(getValue())
                ? JSON.stringify(getValue())
                : text(getValue()),
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
