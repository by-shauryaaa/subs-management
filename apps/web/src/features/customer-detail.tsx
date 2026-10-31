import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { apiClient } from '../lib/api-client';
import { PageHeader } from '../components/layout/page-header';
import { Button } from '../components/ui/button';
import { type Row, text } from './resource-page';
import { RecordState, ActionButton } from './record-tools';
export function CustomerDetail() {
  const { id } = useParams();
  const endpoint = `/customers/${id}`;
  const client = useQueryClient();
  const query = useQuery({
    queryKey: [endpoint],
    queryFn: () => apiClient<Row>(endpoint),
  });
  if (!query.data)
    return <RecordState loading={query.isPending} error={query.error} />;
  const user = query.data.user as Row | undefined;
  return (
    <>
      <PageHeader
        title={text(query.data.name ?? user?.name)}
        description={text(query.data.email ?? user?.email)}
        actions={
          <ActionButton
            endpoint={endpoint}
            action="resend-invite"
            label="Resend invitation"
          />
        }
      />
      <form
        className="max-w-2xl space-y-4 rounded-xl border border-border bg-surface p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            await apiClient(endpoint, {
              method: 'PATCH',
              body: JSON.stringify(
                Object.fromEntries(new FormData(event.currentTarget)),
              ),
            });
            await client.invalidateQueries({ queryKey: [endpoint] });
            toast.success('Customer updated');
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : 'Unable to save',
            );
          }
        }}
      >
        {[
          ['name', 'Name'],
          ['companyName', 'Company'],
          ['phone', 'Phone'],
          ['billingAddress', 'Billing address'],
          ['taxId', 'Tax ID'],
        ].map(([key, label]) => (
          <label key={key} className="block">
            {label}
            <input
              className="input mt-2"
              name={key}
              required={key === 'name'}
              defaultValue={text(
                query.data?.[key!] ?? (key === 'name' ? user?.name : ''),
              )}
            />
          </label>
        ))}
        <Button>Save customer</Button>
      </form>
    </>
  );
}
