import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class NumberingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates the next sequential document number in the format `PREFIX/YYYY/NNNNN`.
   * Atomic and gap-free using PostgreSQL `INSERT ... ON CONFLICT DO UPDATE RETURNING`.
   */
  async next(
    prefix: 'SUB' | 'INV',
    year: number = new Date().getFullYear(),
    client?: Prisma.TransactionClient,
  ): Promise<string> {
    const key = `${prefix}-${year}`;
    const db = client ?? this.prisma;

    // Atomic increment in PostgreSQL
    const rows = await db.$queryRaw<Array<{ value: number }>>`
      INSERT INTO "Sequence" ("key", "value")
      VALUES (${key}, 1)
      ON CONFLICT ("key")
      DO UPDATE SET "value" = "Sequence"."value" + 1
      RETURNING "value"
    `;

    const val = rows[0]?.value ?? 1;
    const formattedNum = String(val).padStart(5, '0');
    return `${prefix}/${year}/${formattedNum}`;
  }
}
