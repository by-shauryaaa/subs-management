import { Global, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from './prisma.service.js';

/**
 * One PrismaService for the whole app. Services may inject either
 * `PrismaService` or `PrismaClient` (same instance), so they can be
 * integration-tested with a plain client.
 */
@Global()
@Module({
  providers: [
    PrismaService,
    { provide: PrismaClient, useExisting: PrismaService },
  ],
  exports: [PrismaService, PrismaClient],
})
export class PrismaModule {}
