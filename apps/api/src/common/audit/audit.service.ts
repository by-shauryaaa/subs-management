import { Injectable, Logger } from '@nestjs/common';
import type { Prisma, Role, AuditLog } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

export interface AuditLogInput {
  actorId?: string | null;
  actorRole?: Role | null;
  entityType: string;
  entityId: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  meta?: Prisma.InputJsonValue | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a financial or domain state transition into the AuditLog table.
   */
  async log(
    input: AuditLogInput,
    client?: Prisma.TransactionClient,
  ): Promise<AuditLog> {
    const db = client ?? this.prisma;
    try {
      const entry = await db.auditLog.create({
        data: {
          actorId: input.actorId ?? null,
          actorRole: input.actorRole ?? null,
          entityType: input.entityType,
          entityId: input.entityId,
          action: input.action,
          fromStatus: input.fromStatus ?? null,
          toStatus: input.toStatus ?? null,
          meta: input.meta ?? undefined,
        },
      });
      return entry;
    } catch (error) {
      this.logger.error(
        `Failed to record audit log for ${input.entityType} ${input.entityId} action ${input.action}`,
        error,
      );
      throw error;
    }
  }
}
