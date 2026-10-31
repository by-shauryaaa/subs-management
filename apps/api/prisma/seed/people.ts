import { hash } from '@node-rs/argon2';
import type { PrismaClient } from '@prisma/client';
import { createCustomerSchema } from '@brightloop/shared';
import { CustomersService } from '../../src/modules/customers/customers.service.js';
import { UsersService } from '../../src/modules/users/users.service.js';

/** Demo-only passwords, printed after seeding and listed in the README. */
export const SEED_STAFF_PASSWORD = 'Staff@12345';
export const SEED_CUSTOMER_PASSWORD = 'Customer@123';

export const SEED_STAFF = [
  { name: 'Priya Sharma', email: 'priya@brightloop.local' },
  { name: 'Rahul Verma', email: 'rahul@brightloop.local' },
] as const;

export const SEED_CUSTOMERS = [
  {
    name: 'Ananya Iyer',
    email: 'ananya@nimbuslabs.in',
    companyName: 'Nimbus Labs',
    phone: '+91 98450 11223',
    billingAddress: '12 Residency Road, Bengaluru 560025',
    taxId: '29AACCN1234F1Z5',
  },
  {
    name: 'Vikram Mehta',
    email: 'vikram@kestreltech.in',
    companyName: 'Kestrel Technologies',
    phone: '+91 98200 44556',
    billingAddress: '401 Bandra Kurla Complex, Mumbai 400051',
    taxId: '27AABCK5678G1Z2',
  },
  {
    name: 'Meera Nair',
    email: 'meera@coastalfoods.in',
    companyName: 'Coastal Foods',
    phone: '+91 94470 77889',
    billingAddress: 'MG Road, Kochi 682016',
    taxId: '32AADCC9012H1Z8',
  },
  {
    name: 'Arjun Reddy',
    email: 'arjun@deccanlogistics.in',
    companyName: 'Deccan Logistics',
    phone: '+91 99890 33445',
    billingAddress: 'HITEC City, Hyderabad 500081',
    taxId: '36AAECD3456J1Z1',
  },
  {
    name: 'Sneha Kulkarni',
    email: 'sneha@punedesign.in',
    companyName: 'Pune Design Studio',
    phone: '+91 98220 66778',
    billingAddress: 'Koregaon Park, Pune 411001',
    taxId: '27AAFCP7890K1Z4',
  },
  {
    name: 'Rohan Gupta',
    email: 'rohan@yamunatextiles.in',
    companyName: 'Yamuna Textiles',
    phone: '+91 98110 99001',
    billingAddress: 'Connaught Place, New Delhi 110001',
    taxId: '07AAGCY2345L1Z6',
  },
  {
    name: 'Kavya Joshi',
    email: 'kavya@joshiclinic.in',
    companyName: 'Joshi Clinic',
    phone: '+91 97250 22334',
    billingAddress: 'CG Road, Ahmedabad 380009',
    taxId: '24AAHCJ6789M1Z3',
  },
  {
    name: 'Farhan Siddiqui',
    email: 'farhan@example.in',
    companyName: null,
    phone: '+91 90040 55667',
    billingAddress: 'Hazratganj, Lucknow 226001',
    taxId: null,
  },
] as const;

/**
 * Staff and customers with demo passwords so every role can log in.
 * Users that already exist (by email) are left untouched.
 */
export async function seedPeople(prisma: PrismaClient): Promise<void> {
  const users = new UsersService(prisma);
  const customers = new CustomersService(prisma);
  const existing = new Set(
    (
      await prisma.user.findMany({
        where: {
          email: {
            in: [...SEED_STAFF, ...SEED_CUSTOMERS].map((p) => p.email),
          },
        },
        select: { email: true },
      })
    ).map((u) => u.email),
  );
  const [staffHash, customerHash] = await Promise.all([
    hash(SEED_STAFF_PASSWORD),
    hash(SEED_CUSTOMER_PASSWORD),
  ]);

  for (const staff of SEED_STAFF.filter((s) => !existing.has(s.email))) {
    const user = await users.createStaff(staff);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: staffHash },
    });
  }
  for (const input of SEED_CUSTOMERS.filter((c) => !existing.has(c.email))) {
    const customer = await customers.create(createCustomerSchema.parse(input));
    await prisma.user.update({
      where: { id: customer.userId },
      data: { passwordHash: customerHash },
    });
  }
}
