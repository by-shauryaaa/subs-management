import {
  flexRender,
  useTable,
  tableFeatures,
  rowSortingFeature,
  rowPaginationFeature,
  type ColumnDef,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState } from '../empty-state';
import { Button } from '../ui/button';
import { useTableParams } from './use-table-params';

const features = tableFeatures({ rowSortingFeature, rowPaginationFeature });

export function DataTable<T extends object>({
  columns,
  data,
  total,
  loading = false,
  error,
  onRetry,
  emptyTitle = 'No records yet',
  emptyDescription = 'Records will appear here once they are created.',
}: {
  columns: ColumnDef<typeof features, T>[];
  data: T[];
  total: number;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const { page, pageSize, sort, q, update } = useTableParams();
  const [sortId, direction] = sort.split(':');
  const table = useTable({
    features,
    columns,
    data,
    manualPagination: true,
    manualSorting: true,
    pageCount: Math.ceil(total / pageSize),
    state: {
      pagination: { pageIndex: page - 1, pageSize },
      sorting: sortId ? [{ id: sortId, desc: direction === 'desc' }] : [],
    },
    onSortingChange: (updater) => {
      const sorting =
        typeof updater === 'function' ? updater(table.state.sorting) : updater;
      const first = sorting[0];
      update({
        sort: first ? `${first.id}:${first.desc ? 'desc' : 'asc'}` : null,
        page: 1,
      });
    },
  });
  return (
    <section
      className="overflow-hidden rounded-md border border-border bg-surface"
      aria-label="Records"
    >
      <div className="border-b border-border p-4">
        <label htmlFor="table-search" className="sr-only">
          Search records
        </label>
        <input
          id="table-search"
          type="search"
          className="input max-w-sm"
          placeholder="Search records…"
          value={q}
          onChange={(event) => update({ q: event.target.value, page: 1 })}
        />
      </div>
      {error ? (
        <div role="alert" className="p-6 text-center">
          <p className="mb-4 text-danger">{error}</p>
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto" aria-busy={loading}>
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {group.headers.map((header) => (
                      <th
                        key={header.id}
                        scope="col"
                        className="px-4 py-3 font-medium"
                        aria-sort={
                          header.column.getIsSorted() === 'asc'
                            ? 'ascending'
                            : header.column.getIsSorted() === 'desc'
                              ? 'descending'
                              : undefined
                        }
                      >
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <button
                            className="inline-flex items-center gap-2"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {header.column.getIsSorted() === 'asc' && (
                              <ArrowUp className="size-4" />
                            )}
                            {header.column.getIsSorted() === 'desc' && (
                              <ArrowDown className="size-4" />
                            )}
                          </button>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }, (_, index) => (
                      <tr key={index}>
                        {columns.map((_, cell) => (
                          <td key={cell} className="p-4">
                            <div className="h-4 animate-pulse rounded bg-muted" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="h-11 border-t border-border hover:bg-muted"
                      >
                        {row.getAllCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          {!loading && data.length === 0 && (
            <EmptyState title={emptyTitle} description={emptyDescription} />
          )}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border p-4 text-sm">
            <span className="text-muted-foreground" aria-live="polite">
              {total === 0 || data.length === 0 ? 0 : (page - 1) * pageSize + 1}
              –{Math.min(page * pageSize, total)} of{' '}
              {total.toLocaleString('en-IN')}
            </span>
            <div className="flex items-center gap-2">
              <label htmlFor="page-size" className="sr-only">
                Rows per page
              </label>
              <select
                id="page-size"
                className="input w-auto"
                value={pageSize}
                onChange={(event) =>
                  update({ pageSize: Number(event.target.value), page: 1 })
                }
              >
                {[25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
              <Button
                aria-label="Previous page"
                variant="outline"
                size="icon"
                disabled={loading || page <= 1}
                onClick={() => update({ page: page - 1 })}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                aria-label="Next page"
                variant="outline"
                size="icon"
                disabled={loading || page * pageSize >= total}
                onClick={() => update({ page: page + 1 })}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
