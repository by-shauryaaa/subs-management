import { useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { Link } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../auth/auth-provider';
import { PageHeader } from '../components/layout/page-header';
import { Button } from '../components/ui/button';
import { DataTable } from '../components/data-table/data-table';
import { useTableParams } from '../components/data-table/use-table-params';
import { Money } from '../components/money';
import { formatDate } from '../lib/format-date';
export interface Row {
  id: string;
  [key: string]: unknown;
}
export interface Page<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    counts?: Record<string, number>;
  };
}
export interface Field {
  key: string;
  label: string;
  type?:
    'text' | 'email' | 'number' | 'date' | 'checkbox' | 'select' | 'textarea';
  required?: boolean;
  min?: number;
  max?: number;
  step?: string;
  options?: string[];
  help?: string;
}
export interface Resource {
  title: string;
  endpoint: string;
  description: string;
  fields: Field[];
  columns: string[];
  staffWrite?: boolean;
  detailPath?: string;
  archive?: boolean;
}
export function valueAt(row: Row, key: string): unknown {
  if (key === 'name' && !row.name && row.user && typeof row.user === 'object')
    return (row.user as Record<string, unknown>).name;
  if (key === 'email' && !row.email && row.user && typeof row.user === 'object')
    return (row.user as Record<string, unknown>).email;
  return row[key];
}
export function text(value: unknown): string {
  return value == null
    ? '—'
    : typeof value === 'object'
      ? 'name' in value
        ? String(value.name)
        : '—'
      : String(value);
}
export function ResourcePage({ config }: { config: Resource }) {
  const { user } = useAuth();
  const canWrite =
    user?.role === 'ADMIN' || (config.staffWrite && user?.role === 'STAFF');
  const { params, page, pageSize, q, sort } = useTableParams();
  const queryParams = new URLSearchParams(params);
  queryParams.set('page', String(page));
  queryParams.set('pageSize', String(pageSize));
  if (q) queryParams.set('q', q);
  if (sort) queryParams.set('sort', sort);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: [config.endpoint, queryParams.toString()],
    queryFn: () => apiClient<Page<Row>>(`${config.endpoint}?${queryParams}`),
    placeholderData: keepPreviousData,
  });
  const [editing, setEditing] = useState<Row | null | undefined>(undefined);
  const mutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id?: string;
      body: Record<string, unknown>;
    }) =>
      apiClient(`${config.endpoint}${id ? `/${id}` : ''}`, {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: [config.endpoint] });
      setEditing(undefined);
      toast.success('Changes saved');
    },
    onError: (error) => toast.error(error.message),
  });
  function submit(form: HTMLFormElement) {
    const values = new FormData(form);
    const body: Record<string, unknown> = {};
    for (const field of config.fields) {
      const raw = values.get(field.key);
      body[field.key] =
        field.type === 'checkbox'
          ? raw === 'on'
          : field.type === 'number' && !['rate', 'price'].includes(field.key)
            ? Number(raw)
            : field.type === 'date' && !raw
              ? null
              : raw;
    }
    if (editing && config.endpoint === '/users') {
      delete body.email;
    }
    mutation.mutate({ id: editing?.id, body });
  }
  return (
    <>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          canWrite && (
            <Button onClick={() => setEditing(null)}>
              <Plus className="size-4" />
              Create {config.title.toLowerCase().replace(/s$/, '')}
            </Button>
          )
        }
      />
      <DataTable
        columns={[
          ...config.columns.map((key, index) => ({
            accessorKey: key,
            header:
              config.fields.find((field) => field.key === key)?.label ??
              key.replace(/([A-Z])/g, ' $1'),
            cell: ({ row }: { row: { original: Row } }) => {
              const value = valueAt(row.original, key);
              const content = ['price', 'salesPrice'].includes(key) ? (
                <Money value={text(value)} />
              ) : key === 'isActive' ? (
                value ? (
                  'Active'
                ) : (
                  'Archived'
                )
              ) : key.endsWith('Date') ? (
                formatDate(typeof value === 'string' ? value : null)
              ) : (
                text(value)
              );
              return index === 0 && config.detailPath ? (
                <Link
                  className="font-medium text-primary"
                  to={`${config.detailPath}/${row.original.id}`}
                >
                  {content}
                </Link>
              ) : (
                content
              );
            },
          })),
          ...(canWrite
            ? [
                {
                  id: 'actions',
                  header: 'Actions',
                  enableSorting: false,
                  cell: ({ row }: { row: { original: Row } }) => (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(row.original)}
                      >
                        Edit
                      </Button>
                      {config.archive && row.original.isActive !== false && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (
                              window.confirm(
                                'Archive this record? Existing documents will remain unchanged.',
                              )
                            )
                              mutation.mutate({
                                id: row.original.id,
                                body: { isActive: false },
                              });
                          }}
                        >
                          Archive
                        </Button>
                      )}
                    </div>
                  ),
                },
              ]
            : []),
        ]}
        data={query.data?.data ?? []}
        total={query.data?.meta.total ?? 0}
        loading={query.isPending}
        error={query.error?.message}
        onRetry={() => {
          void query.refetch();
        }}
        emptyTitle={`No ${config.title.toLowerCase()} yet`}
        emptyDescription="Create a record to get started. Your saved records will appear here."
      />
      <Dialog.Root
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-dvh w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface p-6">
            <div className="flex justify-between gap-4">
              <Dialog.Title className="font-heading text-xl font-semibold">
                {editing ? 'Edit' : 'Create'}{' '}
                {config.title.toLowerCase().replace(/s$/, '')}
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close form">
                  <X className="size-4" />
                </Button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="mt-2 text-muted-foreground">
              Keep your subscription operations up to date.
            </Dialog.Description>
            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                submit(event.currentTarget);
              }}
            >
              {config.fields.map((field) => (
                <label className="block" key={field.key}>
                  <span>
                    {field.label}
                    {field.required && ' *'}
                  </span>
                  {field.type === 'select' ? (
                    <select
                      name={field.key}
                      className="input mt-2"
                      defaultValue={String(
                        editing?.[field.key] ?? field.options?.[0] ?? '',
                      )}
                    >
                      {field.options?.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      className="input mt-2 h-24 py-2"
                      name={field.key}
                      defaultValue={String(
                        valueAt(editing ?? { id: '' }, field.key) ?? '',
                      )}
                    />
                  ) : (
                    <input
                      className={
                        field.type === 'checkbox'
                          ? 'ml-3 size-4 accent-primary'
                          : 'input mt-2'
                      }
                      name={field.key}
                      type={field.type ?? 'text'}
                      required={field.required}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      defaultChecked={
                        field.type === 'checkbox'
                          ? Boolean(
                              editing?.[field.key] ??
                              ['isActive', 'closable', 'renewable'].includes(
                                field.key,
                              ),
                            )
                          : undefined
                      }
                      defaultValue={
                        field.type === 'checkbox'
                          ? undefined
                          : String(
                              valueAt(editing ?? { id: '' }, field.key) ?? '',
                            )
                      }
                    />
                  )}
                  {field.help && (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {field.help}
                    </span>
                  )}
                </label>
              ))}
              <Button disabled={mutation.isPending} type="submit">
                {mutation.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
