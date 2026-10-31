import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { PrismaService } from './common/prisma/prisma.service.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [HealthModule],
  controllers: [AppController],
  providers: [
    PrismaService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [PrismaService],
})
export class AppModule {}
