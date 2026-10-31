import type { Resource, Field } from './resource-page';
const active: Field = { key: 'isActive', label: 'Active', type: 'checkbox' };
const name: Field = { key: 'name', label: 'Name', required: true };
export const resources: Record<string, Resource> = {
  taxes: {
    title: 'Taxes',
    endpoint: '/taxes',
    description: 'Tax rates applied consistently across every billing cycle.',
    archive: true,
    columns: ['name', 'rate', 'isActive'],
    fields: [
      name,
      {
        key: 'rate',
        label: 'Rate (%)',
        type: 'number',
        required: true,
        min: 0,
        max: 100,
        step: '0.01',
      },
      { key: 'description', label: 'Description' },
      active,
    ],
  },
  terms: {
    title: 'Payment terms',
    endpoint: '/payment-terms',
    description: 'Clear expectations. Predictable due dates.',
    archive: true,
    columns: ['name', 'dueDays', 'isActive'],
    fields: [
      name,
      {
        key: 'dueDays',
        label: 'Days until due',
        type: 'number',
        min: 0,
        step: '1',
        required: true,
      },
      active,
    ],
  },
  plans: {
    title: 'Plans',
    endpoint: '/plans',
    description: 'Recurring plans that grow with your customers.',
    archive: true,
    columns: ['name', 'price', 'billingPeriod', 'minQuantity', 'isActive'],
    fields: [
      name,
      {
        key: 'price',
        label: 'Base fee per period',
        type: 'number',
        min: 0,
        step: '0.01',
        required: true,
      },
      {
        key: 'billingPeriod',
        label: 'Billing period',
        type: 'select',
        options: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'],
      },
      {
        key: 'minQuantity',
        label: 'Minimum quantity',
        type: 'number',
        min: 1,
        step: '1',
        required: true,
      },
      { key: 'availableFrom', label: 'Available from', type: 'date' },
      { key: 'availableUntil', label: 'Available until', type: 'date' },
      {
        key: 'autoClose',
        label: 'Automatically close at expiry',
        type: 'checkbox',
        help: 'Close the subscription when its term ends.',
      },
      {
        key: 'closable',
        label: 'Allow early closure',
        type: 'checkbox',
        help: 'Customers and staff may close before expiry.',
      },
      {
        key: 'pausable',
        label: 'Allow pause',
        type: 'checkbox',
        help: 'Paused periods are not billed.',
      },
      {
        key: 'renewable',
        label: 'Allow renewal',
        type: 'checkbox',
        help: 'Continue into a new subscription term.',
      },
      active,
    ],
  },
  users: {
    title: 'Users',
    endpoint: '/users',
    description: 'Manage staff access to your workspace.',
    columns: ['name', 'email', 'role', 'isActive'],
    fields: [
      name,
      { key: 'email', label: 'Email', type: 'email', required: true },
      active,
    ],
  },
  customers: {
    title: 'Customers',
    endpoint: '/customers',
    description: 'Better relationships start with a clearer picture.',
    staffWrite: true,
    detailPath: '/app/customers',
    columns: ['name', 'email', 'companyName', 'phone'],
    fields: [
      name,
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'companyName', label: 'Company' },
      { key: 'phone', label: 'Phone' },
      { key: 'billingAddress', label: 'Billing address', type: 'textarea' },
      { key: 'taxId', label: 'Tax ID' },
    ],
  },
};
export function isAvailable(
  plan: {
    isActive: boolean;
    availableFrom?: string | null;
    availableUntil?: string | null;
  },
  today: string,
) {
  return (
    plan.isActive &&
    (!plan.availableFrom || plan.availableFrom.slice(0, 10) <= today) &&
    (!plan.availableUntil || plan.availableUntil.slice(0, 10) >= today)
  );
}
