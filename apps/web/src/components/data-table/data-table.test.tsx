import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, expect, test } from 'vitest';
import { DataTable } from './data-table';
afterEach(cleanup);
function Location() {
  return <output aria-label="Current URL">{useLocation().search}</output>;
}
test('writes page, search and sort to the URL while preserving feature filters', () => {
  render(
    <MemoryRouter initialEntries={['/?status=ACTIVE']}>
      <DataTable
        columns={[{ accessorKey: 'name', header: 'Name' }]}
        data={[{ name: 'Acme' }]}
        total={60}
      />
      <Location />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(screen.getByLabelText('Current URL').textContent).toContain('page=2');
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'Acme' },
  });
  expect(screen.getByLabelText('Current URL').textContent).toContain('page=1');
  expect(screen.getByLabelText('Current URL').textContent).toContain('q=Acme');
  expect(screen.getByLabelText('Current URL').textContent).toContain(
    'status=ACTIVE',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Name' }));
  expect(screen.getByLabelText('Current URL').textContent).toContain(
    'sort=name',
  );
});
test('shows an API failure without presenting it as an empty result', () => {
  render(
    <MemoryRouter>
      <DataTable
        columns={[]}
        data={[]}
        total={0}
        error="Could not load invoices"
      />
    </MemoryRouter>,
  );
  expect(screen.getByRole('alert').textContent).toContain(
    'Could not load invoices',
  );
  expect(screen.queryByText('No records yet')).toBeNull();
});
