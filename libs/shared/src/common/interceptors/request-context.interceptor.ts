import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';

import { RequestContext } from '../request-context';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const requestId = header(request, 'x-request-id') ?? randomUUID();
    const correlationId = header(request, 'x-correlation-id') ?? requestId;

    response.setHeader('x-request-id', requestId);
    response.setHeader('x-correlation-id', correlationId);

    return new Observable((subscriber) => {
      const subscription = RequestContext.run({ requestId, correlationId }, () =>
        next.handle().subscribe(subscriber),
      );

      return () => subscription.unsubscribe();
    });
  }
}

function header(request: Request, name: string): string | undefined {
  const value = request.headers[name];

  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) {
    return value[0];
  }

  return undefined;
}
