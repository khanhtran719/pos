import {
  InvalidPageRequestError,
  assertPageRequest,
  type PageRequest,
} from './page-request';

export interface PageResult<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly size: number;
  readonly total: number;
}

export interface PageMetadata {
  readonly page: number;
  readonly size: number;
  readonly total: number;
  readonly lastPage: number;
  readonly next: boolean;
}

export function createPageResult<T>(
  items: readonly T[],
  request: PageRequest,
  total: number,
): PageResult<T> {
  assertPageRequest(request);
  assertTotal(total);

  return {
    items: [...items],
    page: request.page,
    size: request.size,
    total,
  };
}

export function toPageMetadata(
  result: Pick<PageResult<unknown>, 'page' | 'size' | 'total'>,
): PageMetadata {
  assertPageRequest(result);
  assertTotal(result.total);

  const lastPage = Math.ceil(result.total / result.size) || 1;

  return {
    page: result.page,
    size: result.size,
    total: result.total,
    lastPage,
    next: result.page * result.size < result.total,
  };
}

function assertTotal(total: number): void {
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new InvalidPageRequestError(
      'total must be an integer greater than or equal to 0',
    );
  }
}
