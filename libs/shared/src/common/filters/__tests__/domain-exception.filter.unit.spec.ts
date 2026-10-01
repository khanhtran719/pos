import { BadRequestException, type ArgumentsHost } from '@nestjs/common';
import { vi } from 'vitest';

import { DomainError } from '../../../domain/domain-error';
import { RequestContext } from '../../request-context';
import { DomainExceptionFilter } from '../domain-exception.filter';

class ItemClosedError extends DomainError {
  readonly code = 'ITEM_CLOSED';

  constructor() {
    super('Item is closed');
  }
}

describe('DomainExceptionFilter', () => {
  const filter = new DomainExceptionFilter();

  function hostFor(response: { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }): ArgumentsHost {
    return {
      switchToHttp: () => ({
        getResponse: () => response,
      }),
    } as ArgumentsHost;
  }

  it('maps a domain error to its code and message', () => {
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };

    RequestContext.run({ requestId: 'req-1', correlationId: 'req-1' }, () => {
      filter.catch(new ItemClosedError(), hostFor(response));
    });

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      code: 'ITEM_CLOSED',
      message: 'Item is closed',
      requestId: 'req-1',
    });
  });

  it('hides unexpected failures behind an internal error', () => {
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };

    filter.catch(new Error('password=secret'), hostFor(response));

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      requestId: undefined,
    });
  });

  it('keeps the status of an http exception', () => {
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };

    filter.catch(new BadRequestException('port is invalid'), hostFor(response));

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      code: 'HTTP_ERROR',
      message: 'port is invalid',
      requestId: undefined,
    });
  });
});
