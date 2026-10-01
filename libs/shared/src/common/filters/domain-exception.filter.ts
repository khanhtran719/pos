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
  data: null;
  errorCode: string;
  message: string;
  status: false;
}

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const requestId = RequestContext.current()?.requestId;

    const body = this.toBody(exception);

    if (!(exception instanceof DomainError) && !(exception instanceof HttpException)) {
      this.logger.error(
        JSON.stringify({
          event: 'unhandled_exception',
          requestId,
          errorType: 'unexpected_error',
        }),
      );
    }

    response.status(body.status).json(body.payload);
  }

  private toBody(exception: unknown): { status: number; payload: ErrorBody } {
    if (exception instanceof DomainError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        payload: errorBody(exception.message),
      };
    }

    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus(),
        payload: errorBody(httpExceptionMessage(exception)),
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      payload: errorBody('Internal server error'),
    };
  }
}

function errorBody(message: string): ErrorBody {
  return {
    data: null,
    errorCode: message,
    message,
    status: false,
  };
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
