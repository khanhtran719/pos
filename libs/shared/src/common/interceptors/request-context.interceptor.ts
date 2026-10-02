import { randomUUID } from 'node:crypto';

import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';

import { RequestContext } from '../request-context';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();
    const requestId = readHeader(request.headers['x-request-id']) ?? randomUUID();
    const correlationId = readHeader(request.headers['x-correlation-id']) ?? requestId;

    response.setHeader('x-request-id', requestId);
    response.setHeader('x-correlation-id', correlationId);

    return new Observable((subscriber) =>
      RequestContext.run({ requestId, correlationId, userId: readUserId(request.user) }, () =>
        next.handle().subscribe(subscriber),
      ),
    );
  }
}

interface RequestWithUser extends Request {
  user?: { readonly userId?: unknown };
}

function readUserId(user: RequestWithUser['user']): string | undefined {
  return typeof user?.userId === 'string' && user.userId !== '' ? user.userId : undefined;
}

function readHeader(value: string | string[] | undefined): string | undefined {
  const firstValue = Array.isArray(value) ? value[0] : value;
  const normalized = firstValue?.trim();

  return normalized ? normalized : undefined;
}
