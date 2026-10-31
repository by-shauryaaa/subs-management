import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { CommonModule } from './common/common.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard.js';
import { HealthModule } from './health/health.module.js';
import { AttributesModule } from './modules/attributes/attributes.module.js';
import { CustomersModule } from './modules/customers/customers.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    HealthModule,
    UsersModule,
    CustomersModule,
    AttributesModule,
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
