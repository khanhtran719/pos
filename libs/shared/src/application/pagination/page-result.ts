import {
  InvalidPageRequestError,
  assertPageRequest,
  type PageRequest,
} from './page-request';

export interface PageResult<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface PageMetadata {
  readonly page: number;
  readonly pageSize: number;
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
    pageSize: request.pageSize,
    total,
  };
}

export function toPageMetadata(
  result: Pick<PageResult<unknown>, 'page' | 'pageSize' | 'total'>,
): PageMetadata {
  assertPageRequest(result);
  assertTotal(result.total);

  const lastPage = Math.ceil(result.total / result.pageSize) || 1;

  return {
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
    lastPage,
    next: result.page * result.pageSize < result.total,
  };
}

function assertTotal(total: number): void {
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new InvalidPageRequestError(
      'total must be an integer greater than or equal to 0',
    );
  }
}
