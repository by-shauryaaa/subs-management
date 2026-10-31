import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Controller, Get, Post, Body, UsePipes } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { AppModule } from '../src/app.module.js';
import { loadEnvironment } from '../src/config/environment.js';
import { signAccess } from '../src/modules/auth/tokens.js';
import { Public } from '../src/common/auth/public.decorator.js';
import { ZodValidationPipe } from '../src/common/pipes/zod-validation.pipe.js';
import { DomainError } from '../src/common/errors/domain.error.js';
import {
  paginate,
  toPrismaOrderBy,
} from '../src/common/pagination/pagination.helper.js';

const testDtoSchema = z.object({
  email: z.string().email(),
  count: z.number().int().min(1),
});

@Controller('test-core')
class TestCoreController {
  @Public()
  @Post('validate')
  @UsePipes(new ZodValidationPipe(testDtoSchema))
  validatePayload(@Body() body: unknown) {
    return { received: body };
  }

  @Public()
  @Get('domain-error')
  throwDomainError() {
    throw new DomainError('CUSTOM_CONFLICT', 'Item already exists', 409, {
      field: 'name',
    });
  }

  @Get('protected')
  protectedRoute() {
    return { secret: 'data' };
  }
}

describe('API Core (P0-04)', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestCoreController],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['/'] });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Endpoint', () => {
    it('GET /api/v1/health returns ok status and ISO timestamp', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
      expect(new Date(res.body.timestamp).toISOString()).toBe(
        res.body.timestamp,
      );
    });
  });

  describe('Global Exception Filter & Error Envelope', () => {
    it('formats DomainError into standard error envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/test-core/domain-error')
        .expect(409);

      expect(res.body).toEqual({
        error: {
          code: 'CUSTOM_CONFLICT',
          message: 'Item already exists',
          details: {
            field: 'name',
          },
        },
      });
    });

    it('formats 404 into standard error envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/non-existent-route')
        .expect(404);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('ZodValidationPipe', () => {
    it('accepts valid payload and returns parsed data', async () => {
      const payload = { email: 'valid@brightloop.local', count: 5 };
      const res = await request(app.getHttpServer())
        .post('/api/v1/test-core/validate')
        .send(payload)
        .expect(201);

      expect(res.body).toEqual({ received: payload });
    });

    it('rejects invalid payload with 400 and structured details', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/test-core/validate')
        .send({ email: 'bad-email', count: 0 })
        .expect(400);

      expect(res.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: {
            email: expect.any(Array),
            count: expect.any(Array),
          },
        },
      });
    });
  });

  describe('JwtAuthGuard', () => {
    it('blocks unauthenticated requests on non-public routes with 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/test-core/protected')
        .expect(401);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects a forged token and accepts a signed one', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/test-core/protected')
        .set('Authorization', 'Bearer fake-token')
        .expect(401);
      const env = loadEnvironment();
      const token = signAccess(
        {
          sub: '00000000-0000-4000-8000-000000000000',
          role: 'ADMIN',
          customerId: null,
        },
        env.JWT_ACCESS_SECRET,
        env.JWT_ACCESS_TTL,
      );
      const res = await request(app.getHttpServer())
        .get('/api/v1/test-core/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toEqual({ secret: 'data' });
    });
  });

  describe('Pagination helper unit checks', () => {
    it('wraps list data into standard pagination envelope', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const result = paginate(items, 50, 2, 25);
      expect(result).toEqual({
        data: items,
        meta: {
          page: 2,
          pageSize: 25,
          total: 50,
        },
      });
    });

    it('converts sort string to Prisma orderBy format', () => {
      expect(toPrismaOrderBy('createdAt:desc')).toEqual({
        createdAt: 'desc',
      });
      expect(toPrismaOrderBy('name:asc')).toEqual({ name: 'asc' });
      expect(toPrismaOrderBy('invalid')).toBeUndefined();
      expect(toPrismaOrderBy(undefined)).toBeUndefined();
    });
  });
});
