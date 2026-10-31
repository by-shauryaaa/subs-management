import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '../errors/domain.error.js';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof DomainError) {
      status = exception.httpStatus;
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        if (resObj['error'] && typeof resObj['error'] === 'object') {
          // Already formatted
          const nested = resObj['error'] as Record<string, unknown>;
          code = String(nested['code'] ?? code);
          message = String(nested['message'] ?? exception.message);
          details = nested['details'] as Record<string, unknown> | undefined;
        } else {
          code = String(resObj['code'] ?? this.getDefaultCodeForStatus(status));
          message = String(resObj['message'] ?? exception.message);
          details = resObj['details'] as Record<string, unknown> | undefined;
        }
      } else {
        code = this.getDefaultCodeForStatus(status);
        message = String(res);
      }
    } else {
      this.logger.error('Unhandled exception caught by filter', exception);
    }

    const errorPayload: ErrorResponse = {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    };

    response.status(status).json(errorPayload);
  }

  private getDefaultCodeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHENTICATED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
