import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../auth/auth-provider';
import { apiClient } from '../lib/api-client';
import { PageHeader } from '../components/layout/page-header';
import { Button } from '../components/ui/button';
import { Money } from '../components/money';
import { type Row, text } from './resource-page';
import { RecordState } from './record-tools';
import { formatDate } from '../lib/format-date';
export function PortalHome() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['/portal/home'],
    queryFn: () => apiClient<Row>('/portal/home'),
  });
  return (
    <>
      <PageHeader
        title={`Hello, ${user?.name ?? 'there'}.`}
        description="Your subscriptions, all in one place."
      />
      <RecordState loading={query.isPending} error={query.error} />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['activeSubscriptions', 'Active subscriptions'],
          ['nextBillingDate', 'Next billing'],
          ['amountDue', 'Amount due'],
        ].map(([key, label]) => (
          <div
            key={key}
            className="rounded-xl border border-border bg-surface p-6"
          >
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-4 text-2xl">
              {query.data?.[key!] == null ? (
                '—'
              ) : key === 'amountDue' ? (
                <Money value={text(query.data[key])} />
              ) : key === 'nextBillingDate' ? (
                formatDate(text(query.data[key]))
              ) : (
                text(query.data[key!])
              )}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-4">
        <Button asChild>
          <Link to="/portal/subscriptions">View subscriptions</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/portal/invoices">View invoices</Link>
        </Button>
      </div>
      <h2 className="mt-10 mb-4 font-heading text-xl">
        Quotations awaiting you
      </h2>
      {Array.isArray(query.data?.quotations) && query.data.quotations.length
        ? (query.data.quotations as Row[]).map((row) => (
            <Link
              key={row.id}
              className="mb-4 flex justify-between rounded-lg border border-border bg-surface p-6"
              to={`/portal/subscriptions/${row.id}`}
            >
              <span>{text(row.number)}</span>
              <span>Review quotation →</span>
            </Link>
          ))
        : !query.isPending &&
          !query.error && (
            <p className="text-muted-foreground">You're all caught up.</p>
          )}
    </>
  );
}
export function PortalProfile() {
  const query = useQuery({
    queryKey: ['/portal/profile'],
    queryFn: () => apiClient<Row>('/portal/profile'),
  });
  const client = useQueryClient();
  const [pending, setPending] = useState(false);
  if (!query.data)
    return <RecordState loading={query.isPending} error={query.error} />;
  return (
    <>
      <PageHeader
        title="Your profile"
        description="Keep your billing and contact details up to date."
      />
      <form
        className="max-w-2xl space-y-4 rounded-xl border border-border bg-surface p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = Object.fromEntries(new FormData(event.currentTarget));
          setPending(true);
          try {
            await apiClient('/portal/profile', {
              method: 'PATCH',
              body: JSON.stringify(data),
            });
            await client.invalidateQueries({ queryKey: ['/portal/profile'] });
            toast.success('Profile updated');
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : 'Unable to save',
            );
          } finally {
            setPending(false);
          }
        }}
      >
        {[
          ['name', 'Name'],
          ['phone', 'Phone'],
          ['companyName', 'Company'],
          ['billingAddress', 'Billing address'],
          ['taxId', 'Tax ID'],
        ].map(([key, label]) => (
          <label key={key} className="block">
            {label}
            <input
              className="input mt-2"
              name={key}
              required={key === 'name'}
              defaultValue={
                query.data?.[key!] == null ? '' : text(query.data[key!])
              }
            />
          </label>
        ))}
        <Button disabled={pending}>
          {pending ? 'Saving…' : 'Save profile'}
        </Button>
      </form>
      <form
        className="mt-8 max-w-2xl space-y-4 rounded-xl border border-border bg-surface p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = Object.fromEntries(new FormData(form));
          if (data.newPassword !== data.confirmPassword) {
            toast.error('Passwords must match');
            return;
          }
          try {
            await apiClient('/auth/change-password', {
              method: 'POST',
              body: JSON.stringify({
                oldPassword: data.oldPassword,
                newPassword: data.newPassword,
              }),
            });
            toast.success('Password changed');
            form.reset();
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : 'Unable to change password',
            );
          }
        }}
      >
        <h2 className="font-heading text-xl">Change password</h2>
        {[
          ['oldPassword', 'Current password'],
          ['newPassword', 'New password'],
          ['confirmPassword', 'Confirm new password'],
        ].map(([key, label]) => (
          <label key={key} className="block">
            {label}
            <input
              className="input mt-2"
              name={key}
              type="password"
              required
              autoComplete={
                key === 'oldPassword' ? 'current-password' : 'new-password'
              }
              minLength={key === 'oldPassword' ? undefined : 9}
              pattern={
                key === 'oldPassword'
                  ? undefined
                  : '(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{9,}'
              }
            />
          </label>
        ))}
        <p className="text-xs text-muted-foreground">
          At least 9 characters, uppercase, lowercase, and a special character.
        </p>
        <Button>Change password</Button>
      </form>
    </>
  );
}
