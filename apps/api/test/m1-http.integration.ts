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
// The P0-04 guard only checks for a header until P1-01/P1-02 land.
const auth = { Authorization: 'Bearer test' };
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
});
