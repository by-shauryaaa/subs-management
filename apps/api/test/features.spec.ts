import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { loadEnvironment } from '../src/config/environment.js';
import { signAccess } from '../src/modules/auth/tokens.js';

type MockFunction = {
  (...args: unknown[]): Promise<unknown>;
  mockImplementation: (impl: (...args: unknown[]) => unknown) => MockFunction;
};

const mockFn = (returnValue: unknown = null): MockFunction => {
  let currentImpl: ((...args: unknown[]) => unknown) | null = null;
  const f = (...args: unknown[]): Promise<unknown> => {
    if (currentImpl) return Promise.resolve(currentImpl(...args));
    return Promise.resolve(returnValue);
  };
  f.mockImplementation = (impl: (...args: unknown[]) => unknown): MockFunction => {
    currentImpl = impl;
    return f as MockFunction;
  };
  return f as MockFunction;
};

describe('Features API (Auth, Discounts, Reports, Portal)', () => {
  let app: INestApplication<Server>;
  const env = loadEnvironment();

  const adminToken = signAccess(
    { sub: 'a0000000-0000-0000-0000-000000000001', role: 'ADMIN', customerId: null },
    env.JWT_ACCESS_SECRET,
    '15m',
  );

  const customerToken = signAccess(
    { sub: 'c0000000-0000-0000-0000-000000000001', role: 'CUSTOMER', customerId: 'c1111111-1111-1111-1111-111111111111' },
    env.JWT_ACCESS_SECRET,
    '15m',
  );

  const mockPrisma = {
    user: {
      findUnique: mockFn(null),
    },
    authToken: {
      findUnique: mockFn(null),
    },
    setting: {
      findMany: mockFn([]),
    },
    subscription: {
      count: mockFn(5),
      findFirst: mockFn(null),
      findMany: mockFn([]),
      groupBy: mockFn([{ status: 'ACTIVE', _count: { _all: 5 } }]),
    },
    payment: {
      findMany: mockFn([]),
    },
    invoice: {
      findMany: mockFn([]),
      count: mockFn(0),
    },
    discount: {
      findMany: mockFn([]),
      count: mockFn(0),
    },
    $transaction: (args: unknown) => {
      if (Array.isArray(args)) {
        return Promise.all(args);
      }
      if (typeof args === 'function') {
        return args(mockPrisma);
      }
      return Promise.resolve(args);
    },
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaClient)
      .useValue(mockPrisma)
      .compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['/'] });
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Auth Reset & Invites', () => {
    it('POST /auth/forgot-password returns 200 with generic message for unknown user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'unknown-user-never-exists@example.test' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('If an account exists');
    });

    it('POST /auth/reset-password rejects invalid token with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: 'fake-token-xyz', password: 'ValidPassword123!' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('POST /auth/accept-invite rejects invalid token with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/accept-invite')
        .send({ token: 'fake-token-xyz', password: 'ValidPassword123!' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Role-based Access & Endpoints', () => {
    it('GET /reports/summary requires authentication (401)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/reports/summary');
      expect(res.status).toBe(401);
    });

    it('GET /reports/summary rejects CUSTOMER role with 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/reports/summary')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it('GET /reports/summary allows ADMIN and returns formatted metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/reports/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('activeSubscriptions');
      expect(res.body).toHaveProperty('mrr');
      expect(res.body).toHaveProperty('revenueCollected');
      expect(res.body).toHaveProperty('invoiced');
      expect(res.body).toHaveProperty('outstanding');
      expect(res.body).toHaveProperty('overdueAmount');
    });

    it('GET /reports/subscriptions-by-status returns status counts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/reports/subscriptions-by-status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((s: { status: string }) => s.status === 'ACTIVE')).toBe(true);
    });

    it('GET /reports/revenue-series returns monthly revenue series', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/reports/revenue-series')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /discounts requires auth and returns paginated result for ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/discounts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });

    it('GET /portal/home rejects ADMIN role with 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/portal/home')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });

    it('GET /portal/home allows CUSTOMER and returns home metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/portal/home')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('activeSubscriptions');
      expect(res.body).toHaveProperty('amountDue');
      expect(res.body).toHaveProperty('quotations');
    });
  });
});
