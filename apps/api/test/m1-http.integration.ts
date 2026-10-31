import 'reflect-metadata';
import type { Server } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { seedBase } from '../prisma/seed/base.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';
import { createTestDatabase } from './support/test-database.js';

const db = createTestDatabase();
let app: INestApplication<Server>;
const auth: Record<string, string> = {};
const api = () => request(app.getHttpServer());

describe('M1 endpoints over HTTP', () => {
  beforeAll(async () => {
    await db.setup();
    await seedBase(db.client, {
      adminEmail: 'admin@brightloop.test',
      adminPassword: 'Admin@12345',
    });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(db.client)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['/'] });
    await app.init();
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@brightloop.test', password: 'Admin@12345' })
      .expect(200);
    auth.Authorization = `Bearer ${login.body.accessToken as string}`;
  });
  afterAll(async () => {
    await app.close();
    await db.teardown();
  });

  it('requires authentication', async () => {
    await api().get('/api/v1/customers').expect(401);
  });

  it('creates and lists customers with the documented envelopes', async () => {
    const created = await api()
      .post('/api/v1/customers')
      .set(auth)
      .send({
        name: 'Ananya',
        email: 'Ananya@Example.test',
        companyName: 'Nimbus',
      })
      .expect(201);
    expect(created.body).toMatchObject({
      name: 'Ananya',
      email: 'ananya@example.test',
      invitePending: true,
    });
    const duplicate = await api()
      .post('/api/v1/customers')
      .set(auth)
      .send({ name: 'Again', email: 'ananya@example.test' })
      .expect(409);
    expect(duplicate.body.error.code).toBe('EMAIL_TAKEN');
    const invalid = await api()
      .post('/api/v1/customers')
      .set(auth)
      .send({ name: '', email: 'nope' })
      .expect(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(invalid.body.error.details)).toEqual(
      expect.arrayContaining(['name', 'email']),
    );
    const list = await api()
      .get('/api/v1/customers?q=nimbus&pageSize=10')
      .set(auth)
      .expect(200);
    expect(list.body.meta).toEqual({ page: 1, pageSize: 10, total: 1 });
    await api().get('/api/v1/customers/not-a-uuid').set(auth).expect(400);
  });

  it('creates a product, an Odoo variant and finds it in the picker', async () => {
    const product = await api()
      .post('/api/v1/products')
      .set(auth)
      .send({
        name: 'CRM',
        type: 'SERVICE',
        salesPrice: '1000',
        costPrice: '300',
      })
      .expect(201);
    expect(product.body.variants).toHaveLength(1);
    const attributes = await api()
      .get('/api/v1/attributes')
      .set(auth)
      .expect(200);
    const odoo = attributes.body.data[0].values.find(
      (v: { name: string }) => v.name === 'Odoo',
    );
    await api()
      .post(`/api/v1/products/${product.body.id}/variants`)
      .set(auth)
      .send({ attributeValueIds: [odoo.id] })
      .expect(201);
    const picker = await api()
      .get('/api/v1/variants?q=odoo')
      .set(auth)
      .expect(200);
    expect(picker.body.data[0]).toMatchObject({
      label: 'CRM (Odoo)',
      price: '1560.00',
    });
    await api()
      .delete(`/api/v1/products/${product.body.id}`)
      .set(auth)
      .expect(204);
    await api()
      .get(`/api/v1/products/${product.body.id}`)
      .set(auth)
      .expect(404);
  });

  it('creates staff and refuses to deactivate an admin', async () => {
    await api()
      .post('/api/v1/users')
      .set(auth)
      .send({ name: 'Sara', email: 'sara@brightloop.test' })
      .expect(201);
    const admin = await db.client.user.findFirstOrThrow({
      where: { role: 'ADMIN' },
    });
    const res = await api()
      .patch(`/api/v1/users/${admin.id}`)
      .set(auth)
      .send({ isActive: false })
      .expect(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('runs the core flow: subscription → activate → invoice → payment → PAID', async () => {
    const [customer] = (
      await api().get('/api/v1/customers').set(auth).expect(200)
    ).body.data;
    const plan = (
      await api()
        .post('/api/v1/plans')
        .set(auth)
        .send({ name: 'Monthly', price: '100.00', billingPeriod: 'MONTHLY' })
        .expect(201)
    ).body;
    const term = (
      await api().get('/api/v1/payment-terms').set(auth).expect(200)
    ).body.data[0];
    const tax = (
      await api().get('/api/v1/taxes').set(auth).expect(200)
    ).body.data.find((t: { name: string }) => t.name === 'GST 18%');
    const sub = (
      await api()
        .post('/api/v1/subscriptions')
        .set(auth)
        .send({
          customerId: customer.id,
          planId: plan.id,
          paymentTermId: term.id,
          startDate: '2026-01-01',
          lines: [
            {
              description: 'Seat',
              quantity: 2,
              unitPrice: '1560.00',
              taxIds: [tax.id],
            },
          ],
        })
        .expect(201)
    ).body;
    expect(sub).toMatchObject({
      status: 'DRAFT',
      subtotal: '3220.00',
      allowedActions: ['send', 'confirm', 'cancel'],
    });
    await api()
      .post(`/api/v1/subscriptions/${sub.id}/activate`)
      .set(auth)
      .expect(409);
    await api()
      .post(`/api/v1/subscriptions/${sub.id}/confirm`)
      .set(auth)
      .expect(200);
    const active = (
      await api()
        .post(`/api/v1/subscriptions/${sub.id}/activate`)
        .set(auth)
        .expect(200)
    ).body;
    expect(active.status).toBe('ACTIVE');

    const invoices = async () =>
      (
        await api()
          .get(`/api/v1/invoices?subscriptionId=${sub.id}&pageSize=100`)
          .set(auth)
          .expect(200)
      ).body;
    const first = await invoices();
    expect(first.meta.total).toBeGreaterThanOrEqual(10); // catch-up from Jan 2026
    await api().post('/api/v1/billing/run').set(auth).expect(200);
    await api().post('/api/v1/billing/run').set(auth).expect(200);
    expect((await invoices()).meta.total).toBe(first.meta.total);

    const invoice = first.data.at(-1);
    expect(invoice).toMatchObject({
      status: 'CONFIRMED',
      total: '3781.60',
      isOverdue: true,
    });
    await api()
      .post(`/api/v1/invoices/${invoice.id}/payments`)
      .set(auth)
      .send({ amount: '5000' })
      .expect(422);
    await api()
      .post(`/api/v1/invoices/${invoice.id}/payments`)
      .set(auth)
      .send({ amount: '1000' })
      .expect(201);
    const paid = (
      await api()
        .post(`/api/v1/invoices/${invoice.id}/payments`)
        .set(auth)
        .send({ amount: '2781.60' })
        .expect(201)
    ).body;
    expect(paid).toMatchObject({ status: 'PAID', amountDue: '0.00' });
    const history = (
      await api()
        .get(`/api/v1/subscriptions/${sub.id}/history`)
        .set(auth)
        .expect(200)
    ).body;
    expect(history.map((h: { action: string }) => h.action)).toEqual(
      expect.arrayContaining([
        'created',
        'transition:confirm',
        'transition:activate',
      ]),
    );
  });

  it('enforces roles: staff cannot manage users', async () => {
    await db.client.user.update({
      where: { email: 'sara@brightloop.test' },
      data: {
        passwordHash: (
          await db.client.user.findFirstOrThrow({ where: { role: 'ADMIN' } })
        ).passwordHash,
      },
    });
    const login = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'sara@brightloop.test', password: 'Admin@12345' })
      .expect(200);
    const staff = {
      Authorization: `Bearer ${login.body.accessToken as string}`,
    };
    await api().get('/api/v1/users').set(staff).expect(403);
    await api().get('/api/v1/customers').set(staff).expect(200);
    await api()
      .post('/api/v1/auth/login')
      .send({ email: 'sara@brightloop.test', password: 'wrong' })
      .expect(401);
  });
});
