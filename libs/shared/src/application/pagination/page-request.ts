export interface PageRequest {
  readonly page: number;
  readonly size: number;
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

export function createPageRequest(page: number, size: number): PageRequest {
  assertPageNumber(page, 'page');
  assertPageNumber(size, 'size');

  return { page, size };
}

export function toPageWindow(request: PageRequest): PageWindow {
  assertPageRequest(request);

  return {
    offset: (request.page - 1) * request.size,
    limit: request.size,
  };
}

export function assertPageRequest(request: PageRequest): void {
  assertPageNumber(request.page, 'page');
  assertPageNumber(request.size, 'size');
}

function assertPageNumber(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new InvalidPageRequestError(
      `${name} must be an integer greater than or equal to 1`,
    );
  }
}
