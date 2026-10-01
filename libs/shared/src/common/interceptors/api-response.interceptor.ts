import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';

import { toPageMetadata, type PageMetadata, type PageResult } from '../../application/pagination';

export interface ApiSuccessResponse<T> {
  readonly data: T | null;
  readonly errorCode: null;
  readonly message: null;
  readonly status: true;
}

export interface PaginatedApiSuccessResponse<T> extends ApiSuccessResponse<readonly T[]> {
  readonly metadata: PageMetadata;
}

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();

    if (isHealthPath(request.path)) {
      return next.handle();
    }

    return next.handle().pipe(map((value: unknown) => toSuccessResponse(value)));
  }
}

function toSuccessResponse(
  value: unknown,
): ApiSuccessResponse<unknown> | PaginatedApiSuccessResponse<unknown> {
  if (isPageResult(value)) {
    return {
      data: value.items,
      metadata: toPageMetadata(value),
      errorCode: null,
      message: null,
      status: true,
    };
  }

  return {
    data: value === undefined ? null : value,
    errorCode: null,
    message: null,
    status: true,
  };
}

function isPageResult(value: unknown): value is PageResult<unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<PageResult<unknown>>;

  return (
    Array.isArray(candidate.items) &&
    Number.isSafeInteger(candidate.page) &&
    Number.isSafeInteger(candidate.pageSize) &&
    Number.isSafeInteger(candidate.total) &&
    (candidate.page ?? 0) >= 1 &&
    (candidate.pageSize ?? 0) >= 1 &&
    (candidate.total ?? -1) >= 0
  );
}

function isHealthPath(path: string): boolean {
  return path === '/live' || path === '/ready';
}
