import {
  createCustomerSchema,
  customerListQuerySchema,
  userListQuerySchema,
} from '@brightloop/shared';
import { CustomersService } from '../src/modules/customers/customers.service.js';
import { UsersService } from '../src/modules/users/users.service.js';
import { createTestDatabase } from './support/test-database.js';

const db = createTestDatabase();
const customers = new CustomersService(db.client);
const users = new UsersService(db.client);

const customerInput = (n: number, extra: Record<string, unknown> = {}) =>
  createCustomerSchema.parse({
    name: `Customer ${String(n).padStart(2, '0')}`,
    email: `Customer${n}@Example.test`,
    companyName: n % 2 === 0 ? `Acme ${n}` : '',
    ...extra,
  });

describe('customers and users services', () => {
  beforeAll(async () => {
    await db.setup();
    for (let n = 1; n <= 12; n += 1) await customers.create(customerInput(n));
  });
  afterAll(() => db.teardown());

  it('creates a CUSTOMER user with no password and a flat profile row', async () => {
    const created = await customers.create(
      customerInput(99, { phone: '98765 43210', taxId: 'GSTIN-1' }),
    );
    expect(created).toMatchObject({
      name: 'Customer 99',
      email: 'customer99@example.test',
      phone: '98765 43210',
      taxId: 'GSTIN-1',
      isActive: true,
      invitePending: true,
    });
    expect(created).not.toHaveProperty('passwordHash');
    const user = await db.client.user.findUniqueOrThrow({
      where: { id: created.userId },
    });
    expect(user.role).toBe('CUSTOMER');
    expect(user.passwordHash).toBeNull();
    await expect(customers.get(created.id)).resolves.toEqual(created);
  });

  it('rejects a duplicate email case-insensitively with EMAIL_TAKEN', async () => {
    await expect(
      customers.create(customerInput(1, { email: 'CUSTOMER1@example.test' })),
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN', httpStatus: 409 });
    await expect(
      users.createStaff({ name: 'Dup', email: 'customer1@example.test' }),
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
  });

  it('paginates, searches and sorts customers', async () => {
    const page = await customers.list(
      customerListQuerySchema.parse({ pageSize: '5', page: '2' }),
    );
    expect(page.meta).toEqual({ page: 2, pageSize: 5, total: 13 });
    expect(page.data.map((c) => c.name)).toEqual([
      'Customer 06',
      'Customer 07',
      'Customer 08',
      'Customer 09',
      'Customer 10',
    ]);
    const search = await customers.list(
      customerListQuerySchema.parse({ q: 'acme 1', sort: 'name:desc' }),
    );
    expect(search.data.map((c) => c.companyName)).toEqual([
      'Acme 12',
      'Acme 10',
    ]);
  });

  it('edits profile and user fields and returns NOT_FOUND for unknown IDs', async () => {
    const [first] = (await customers.list(customerListQuerySchema.parse({})))
      .data;
    const updated = await customers.update(first!.id, {
      name: 'Renamed',
      billingAddress: '1 MG Road',
      companyName: null,
    });
    expect(updated).toMatchObject({
      name: 'Renamed',
      billingAddress: '1 MG Road',
      companyName: null,
    });
    await expect(
      customers.update(first!.id, { email: 'customer2@example.test' }),
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
    const unknown = '00000000-0000-4000-8000-000000000000';
    await expect(customers.get(unknown)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      httpStatus: 404,
    });
    await expect(
      customers.update(unknown, { name: 'x' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('creates staff and filters the users list by role', async () => {
    const staff = await users.createStaff({
      name: 'Sara Staff',
      email: 'sara@brightloop.test',
    });
    expect(staff).toMatchObject({
      role: 'STAFF',
      invitePending: true,
      customerId: null,
    });
    const list = await users.list(userListQuerySchema.parse({ role: 'STAFF' }));
    expect(list.data.map((u) => u.email)).toEqual(['sara@brightloop.test']);
  });

  it('deactivating a user revokes all of their refresh tokens', async () => {
    const staff = await users.createStaff({
      name: 'Tom Staff',
      email: 'tom@brightloop.test',
    });
    await db.client.refreshToken.createMany({
      data: ['a', 'b'].map((suffix) => ({
        userId: staff.id,
        tokenHash: `${staff.id}-${suffix}`,
        expiresAt: new Date(Date.now() + 86_400_000),
      })),
    });
    const updated = await users.update(staff.id, { isActive: false });
    expect(updated.isActive).toBe(false);
    const tokens = await db.client.refreshToken.findMany({
      where: { userId: staff.id },
    });
    expect(tokens.every((token) => token.revokedAt !== null)).toBe(true);
    const inactive = await users.list(
      userListQuerySchema.parse({ isActive: 'false' }),
    );
    expect(inactive.data.map((u) => u.id)).toContain(staff.id);
  });

  it('refuses to change admin accounts', async () => {
    const admin = await db.client.user.create({
      data: { name: 'Root', email: 'root@brightloop.test', role: 'ADMIN' },
    });
    await expect(
      users.update(admin.id, { isActive: false }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', httpStatus: 403 });
  });
});
