import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { Roles } from '../../common/auth/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import {
  ReportsService,
  overdueReportQuerySchema,
  reportFilterSchema,
} from './reports.service.js';

@Roles('ADMIN', 'STAFF')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  summary(
    @Query(new ZodValidationPipe(reportFilterSchema))
    query: z.infer<typeof reportFilterSchema>,
  ) {
    return this.reports.summary(query);
  }

  @Get('revenue-series')
  revenueSeries(
    @Query(new ZodValidationPipe(reportFilterSchema))
    query: z.infer<typeof reportFilterSchema>,
  ) {
    return this.reports.revenueSeries(query);
  }

  @Get('subscriptions-by-status')
  subscriptionsByStatus(
    @Query(new ZodValidationPipe(reportFilterSchema))
    query: z.infer<typeof reportFilterSchema>,
  ) {
    return this.reports.subscriptionsByStatus(query);
  }

  @Get('overdue')
  overdue(
    @Query(new ZodValidationPipe(overdueReportQuerySchema))
    query: z.infer<typeof overdueReportQuerySchema>,
  ) {
    return this.reports.overdue(query);
  }
}
