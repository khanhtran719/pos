import {
  InvalidPageRequestError,
  createPageRequest,
  toPageWindow,
} from '../page-request';
import { createPageResult, toPageMetadata } from '../page-result';

describe('pagination', () => {
  it('turns the first page into a zero offset', () => {
    const request = createPageRequest(1, 10);

    expect(toPageWindow(request)).toEqual({ offset: 0, limit: 10 });
  });

  it('turns a later page into the matching offset', () => {
    expect(toPageWindow(createPageRequest(3, 10))).toEqual({
      offset: 20,
      limit: 10,
    });
  });

  it('keeps items inside the page result and reports a following page', () => {
    const result = createPageResult(['a', 'b'], createPageRequest(2, 10), 25);

    expect(result.items).toEqual(['a', 'b']);
    expect(toPageMetadata(result)).toEqual({
      page: 2,
      size: 10,
      total: 25,
      lastPage: 3,
      next: true,
    });
  });

  it('reports no following page on the last full page', () => {
    const result = createPageResult(['a'], createPageRequest(2, 10), 20);

    expect(toPageMetadata(result)).toEqual({
      page: 2,
      size: 10,
      total: 20,
      lastPage: 2,
      next: false,
    });
  });

  it('uses last page 1 when nothing matches', () => {
    const result = createPageResult([], createPageRequest(1, 10), 0);

    expect(toPageMetadata(result)).toEqual({
      page: 1,
      size: 10,
      total: 0,
      lastPage: 1,
      next: false,
    });
  });

  it('rejects a page or size below 1 and a negative total', () => {
    expect(() => createPageRequest(0, 10)).toThrow(InvalidPageRequestError);
    expect(() => createPageRequest(1, 1.5)).toThrow(InvalidPageRequestError);
    expect(() => createPageResult([], createPageRequest(1, 10), -1)).toThrow(
      InvalidPageRequestError,
    );
  });
});
