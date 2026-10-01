import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

import { DomainError } from '../../domain/domain-error';
import { RequestContext } from '../request-context';

interface ErrorBody {
  code: string;
  message: string;
  requestId?: string;
}

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const requestId = RequestContext.current()?.requestId;
    const body = this.toBody(exception, requestId);

    if (!(exception instanceof DomainError) && !(exception instanceof HttpException)) {
      this.logger.error(
        JSON.stringify({
          event: 'unhandled_exception',
          requestId,
          message: exception instanceof Error ? exception.message : 'unknown error',
        }),
      );
    }

    response.status(body.status).json(body.payload);
  }

  private toBody(
    exception: unknown,
    requestId: string | undefined,
  ): { status: number; payload: ErrorBody } {
    if (exception instanceof DomainError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        payload: {
          code: exception.code,
          message: exception.message,
          requestId,
        },
      };
    }

    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus(),
        payload: {
          code: 'HTTP_ERROR',
          message: httpExceptionMessage(exception),
          requestId,
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      payload: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId,
      },
    };
  }
}

function httpExceptionMessage(exception: HttpException): string {
  const body = exception.getResponse();

  if (typeof body === 'string') {
    return body;
  }

  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message = body.message;

    if (Array.isArray(message)) {
      return message.map(String).join(', ');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  return exception.message;
}
