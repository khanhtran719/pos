import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, lastValueFrom, of } from 'rxjs';

import { RequestContext } from '../../request-context';
import { RequestContextInterceptor } from '../request-context.interceptor';

describe('RequestContextInterceptor', () => {
  it('propagates inbound request and correlation identifiers', async () => {
    const request = {
      headers: {
        'x-request-id': 'req-1',
        'x-correlation-id': 'corr-1',
      },
    } as unknown as Request;
    const response = { setHeader: vi.fn() } as unknown as Response;
    const context = httpContext(request, response);
    let seenContext: ReturnType<typeof RequestContext.current>;
    const next: CallHandler = {
      handle: () =>
        new Observable((subscriber) => {
          seenContext = RequestContext.current();
          subscriber.next('ok');
          subscriber.complete();
        }),
    };

    await expect(
      lastValueFrom(new RequestContextInterceptor().intercept(context, next)),
    ).resolves.toBe('ok');
    expect(seenContext).toEqual({
      requestId: 'req-1',
      correlationId: 'corr-1',
    });
    expect(response.setHeader).toHaveBeenCalledWith('x-request-id', 'req-1');
    expect(response.setHeader).toHaveBeenCalledWith('x-correlation-id', 'corr-1');
  });

  it('generates identifiers when the inbound headers are absent', async () => {
    const request = { headers: {} } as unknown as Request;
    const response = { setHeader: vi.fn() } as unknown as Response;
    const context = httpContext(request, response);
    let seenContext: ReturnType<typeof RequestContext.current>;
    const next: CallHandler = {
      handle: () => {
        seenContext = RequestContext.current();
        return of('ok');
      },
    };

    await lastValueFrom(new RequestContextInterceptor().intercept(context, next));

    expect(seenContext?.requestId).toBeTruthy();
    expect(seenContext?.correlationId).toBe(seenContext?.requestId);
  });

  it('adds the authenticated user to the request context', async () => {
    const request = {
      headers: {},
      user: { userId: 'user-1', sessionId: 'session-1' },
    } as unknown as Request;
    const response = { setHeader: vi.fn() } as unknown as Response;
    let seenContext: ReturnType<typeof RequestContext.current>;
    const next: CallHandler = {
      handle: () =>
        new Observable((subscriber) => {
          seenContext = RequestContext.current();
          subscriber.next('ok');
          subscriber.complete();
        }),
    };

    await lastValueFrom(
      new RequestContextInterceptor().intercept(httpContext(request, response), next),
    );

    expect(seenContext?.userId).toBe('user-1');
  });
});

function httpContext(request: Request, response: Response): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as ExecutionContext;
}
