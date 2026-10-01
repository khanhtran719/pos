export interface PageRequest {
  readonly page: number;
  readonly pageSize: number;
}

export interface PageWindow {
  readonly offset: number;
  readonly limit: number;
}

export class InvalidPageRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export function createPageRequest(page: number, pageSize: number): PageRequest {
  assertPageNumber(page, 'page');
  assertPageNumber(pageSize, 'pageSize');

  return { page, pageSize };
}

export function toPageWindow(request: PageRequest): PageWindow {
  assertPageRequest(request);

  return {
    offset: (request.page - 1) * request.pageSize,
    limit: request.pageSize,
  };
}

export function assertPageRequest(request: PageRequest): void {
  assertPageNumber(request.page, 'page');
  assertPageNumber(request.pageSize, 'pageSize');
}

function assertPageNumber(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new InvalidPageRequestError(
      `${name} must be an integer greater than or equal to 1`,
    );
  }
}
