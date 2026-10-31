import { Prisma } from '@prisma/client';
import { DomainError } from './domain.error.js';

export function notFound(entity: string): DomainError {
  return new DomainError('NOT_FOUND', `${entity} not found`, 404);
}

/** True for a Prisma unique-constraint violation (P2002). */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

/** True when an update/delete target does not exist (P2025). */
export function isRecordNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}
