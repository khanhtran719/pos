import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';

import { createPageRequest, createPageResult } from '../../../application/pagination';
import { ApiResponseInterceptor } from '../api-response.interceptor';

describe('ApiResponseInterceptor', () => {
  it('wraps a response DTO in the standard success envelope', async () => {
    const next: CallHandler = {
      handle: () => of({ id: 'item-1' }),
    };

    await expect(
      lastValueFrom(new ApiResponseInterceptor().intercept(httpContext('/api/items'), next)),
    ).resolves.toEqual({
      data: { id: 'item-1' },
      errorCode: null,
      message: null,
      status: true,
    });
  });

  it('maps a page result to data and pageSize metadata', async () => {
    const next: CallHandler = {
      handle: () => of(createPageResult([{ id: 'item-1' }], createPageRequest(2, 10), 25)),
    };

    await expect(
      lastValueFrom(new ApiResponseInterceptor().intercept(httpContext('/api/items'), next)),
    ).resolves.toEqual({
      data: [{ id: 'item-1' }],
      metadata: {
        page: 2,
        pageSize: 10,
        total: 25,
        lastPage: 3,
        next: true,
      },
      errorCode: null,
      message: null,
      status: true,
    });
  });

  it.each(['/live', '/ready'])(
    'keeps the %s health payload outside the API envelope',
    async (path) => {
      const next: CallHandler = {
        handle: () => of({ status: 'ok' }),
      };

      await expect(
        lastValueFrom(new ApiResponseInterceptor().intercept(httpContext(path), next)),
      ).resolves.toEqual({ status: 'ok' });
    },
  );
});

function httpContext(path: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ path }),
    }),
  } as ExecutionContext;
}
