import { PipeTransform, Injectable } from '@nestjs/common';
import { type ZodType, ZodError } from 'zod';
import { DomainError } from '../errors/domain.error.js';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema?: ZodType) {}

  transform(value: unknown): unknown {
    if (!this.schema) {
      return value;
    }

    const result = this.schema.safeParse(value);
    if (!result.success) {
      const details = this.formatZodIssues(result.error);
      throw new DomainError(
        'VALIDATION_ERROR',
        'Validation failed',
        400,
        details,
      );
    }

    return result.data;
  }

  private formatZodIssues(error: ZodError): Record<string, string[]> {
    const details: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join('.') || 'root';
      const existing = details[key] ?? [];
      existing.push(issue.message);
      details[key] = existing;
    }
    return details;
  }
}
