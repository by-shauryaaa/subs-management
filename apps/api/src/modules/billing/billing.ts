import {
  Controller,
  Get,
  HttpCode,
  Injectable,
  Logger,
  Module,
  Post,
  Query,
} from '@nestjs/common';
import { PrismaClient, type BillingRunTrigger } from '@prisma/client';
import {
  type PaginationQueryDto,
  paginationQuerySchema,
  todayInTz,
} from '@brightloop/shared';
import {
  type AuthUser,
  CurrentUser,
  Roles,
} from '../../common/auth/roles.decorator.js';
import { DomainError } from '../../common/errors/domain.error.js';
import { paginate } from '../../common/pagination/pagination.helper.js';
import { pageArgs } from '../../common/pagination/page.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { readSettings } from '../config/config.controllers.js';
import { toDate, toIso } from '../subscriptions/numbering.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';

const LOCK_KEY = 4_242_001;

/**
 * Daily billing run (INV-01, SUB-07): activate confirmed subscriptions whose
 * start date has come, bill every due period (catch-up included), close
 * expired ones. One transaction per subscription; one failure never stops the run.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async run(trigger: BillingRunTrigger, actorId: string | null) {
    const [lock] = await this.prisma.$queryRaw<
      { locked: boolean }[]
    >`SELECT pg_try_advisory_lock(${LOCK_KEY}) AS locked`;
    if (!lock?.locked)
      throw new DomainError(
        'BILLING_ALREADY_RUNNING',
        'A billing run is already in progress',
        409,
      );
    try {
      const today = todayInTz((await readSettings(this.prisma)).timezone);
      const run = await this.prisma.billingRun.create({
        data: { trigger, triggeredById: actorId, runDate: toDate(today) },
      });
      const failures: {
        subscriptionId: string;
        number: string;
        error: string;
      }[] = [];
      let activated = 0;
      let invoicesCreated = 0;
      let closed = 0;

      const due = await this.prisma.subscription.findMany({
        where: {
          OR: [
            { status: 'CONFIRMED', startDate: { lte: toDate(today) } },
            { status: 'ACTIVE', nextBillingDate: { lte: toDate(today) } },
            {
              status: { in: ['ACTIVE', 'PAUSED'] },
              expiryDate: { lte: toDate(today) },
            },
          ],
        },
        select: { id: true, number: true, status: true },
      });
      for (const sub of due) {
        try {
          if (sub.status === 'CONFIRMED') {
            await this.subscriptions.transition(sub.id, 'activate', actorId);
            activated += 1;
            invoicesCreated += await this.prisma.invoice.count({
              where: { subscriptionId: sub.id },
            });
            continue;
          }
          invoicesCreated += await this.prisma.$transaction((tx) =>
            this.subscriptions.billDue(tx, sub.id, actorId, today),
          );
          const current = await this.prisma.subscription.findUniqueOrThrow({
            where: { id: sub.id },
            include: { plan: true, renewal: true },
          });
          if (
            current.expiryDate &&
            toIso(current.expiryDate) <= today &&
            (current.plan.autoClose || current.renewal)
          ) {
            await this.prisma.$transaction(async (tx) => {
              await tx.subscription.update({
                where: { id: sub.id },
                data: {
                  status: 'CLOSED',
                  closedAt: new Date(),
                  closeReason: 'expired',
                },
              });
              await tx.auditLog.create({
                data: {
                  actorId,
                  entityType: 'Subscription',
                  entityId: sub.id,
                  action: 'transition:close',
                  fromStatus: current.status,
                  toStatus: 'CLOSED',
                  meta: { note: 'Expired' },
                },
              });
            });
            closed += 1;
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Billing failed for ${sub.number}: ${message}`);
          failures.push({
            subscriptionId: sub.id,
            number: sub.number,
            error: message,
          });
        }
      }
      return this.prisma.billingRun.update({
        where: { id: run.id },
        data: {
          finishedAt: new Date(),
          subscriptionsProcessed: due.length,
          invoicesCreated,
          activated,
          closed,
          failures,
        },
      });
    } finally {
      await this.prisma.$queryRaw`SELECT pg_advisory_unlock(${LOCK_KEY})`;
    }
  }
}

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly prisma: PrismaClient,
  ) {}

  @Roles('ADMIN')
  @Post('run')
  @HttpCode(200)
  run(@CurrentUser() user: AuthUser) {
    return this.billing.run('MANUAL', user.sub);
  }

  @Roles('ADMIN', 'STAFF')
  @Get('runs')
  async runs(
    @Query(new ZodValidationPipe(paginationQuerySchema)) q: PaginationQueryDto,
  ) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.billingRun.findMany({
        orderBy: { startedAt: 'desc' },
        ...pageArgs(q.page, q.pageSize),
      }),
      this.prisma.billingRun.count(),
    ]);
    return paginate(
      rows.map((r) => ({ ...r, runDate: toIso(r.runDate) })),
      total,
      q.page,
      q.pageSize,
    );
  }
}

@Module({
  controllers: [BillingController],
  providers: [BillingService, SubscriptionsService],
  exports: [BillingService],
})
export class BillingModule {}
