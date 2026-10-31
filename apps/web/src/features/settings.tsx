import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '../lib/api-client';
import { PageHeader } from '../components/layout/page-header';
import { Button } from '../components/ui/button';
import { RecordState } from './record-tools';
import { type Row, text } from './resource-page';
export function SettingsPage() {
  const query = useQuery({
    queryKey: ['/settings'],
    queryFn: () => apiClient<Row>('/settings'),
  });
  const client = useQueryClient();
  const [pending, setPending] = useState(false);
  if (!query.data)
    return <RecordState loading={query.isPending} error={query.error} />;
  return (
    <>
      <PageHeader
        title="Settings"
        description="The details behind every document and billing cycle."
      />
      <form
        className="max-w-3xl space-y-6 rounded-xl border border-border bg-surface p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const body = {
            ...Object.fromEntries(data),
            autoConfirmInvoices: data.get('autoConfirmInvoices') === 'on',
            defaultQuotationValidityDays: Number(
              data.get('defaultQuotationValidityDays'),
            ),
          };
          setPending(true);
          try {
            await apiClient('/settings', {
              method: 'PATCH',
              body: JSON.stringify(body),
            });
            await client.invalidateQueries({ queryKey: ['/settings'] });
            toast.success('Settings saved');
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : 'Unable to save settings',
            );
          } finally {
            setPending(false);
          }
        }}
      >
        {[
          ['companyName', 'Company name'],
          ['companyAddress', 'Company address'],
          ['companyTaxId', 'Company tax ID'],
          ['currency', 'Currency code'],
          ['timezone', 'Business time zone'],
          ['defaultQuotationValidityDays', 'Quotation validity (days)'],
          ['invoiceFooter', 'Invoice footer'],
        ].map(([key, label]) => (
          <label key={key} className="block">
            {label}
            <input
              className="input mt-2"
              name={key}
              type={key === 'defaultQuotationValidityDays' ? 'number' : 'text'}
              min={key === 'defaultQuotationValidityDays' ? 1 : undefined}
              required={[
                'companyName',
                'currency',
                'timezone',
                'defaultQuotationValidityDays',
              ].includes(key!)}
              defaultValue={
                query.data?.[key!] == null ? '' : text(query.data[key!])
              }
            />
          </label>
        ))}
        <label className="flex gap-3">
          <input
            type="checkbox"
            name="autoConfirmInvoices"
            defaultChecked={Boolean(query.data.autoConfirmInvoices)}
          />
          Automatically confirm generated invoices
        </label>
        <Button disabled={pending}>
          {pending ? 'Saving…' : 'Save settings'}
        </Button>
      </form>
    </>
  );
}
