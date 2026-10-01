import { BadRequestException, type ArgumentsHost, Logger } from '@nestjs/common';
import { vi } from 'vitest';

import { DomainError } from '../../../domain/domain-error';
import { ValidationException } from '../../exceptions/validation.exception';
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

  function hostFor(response: {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  }): ArgumentsHost {
    return {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ headers: {} }),
      }),
    } as ArgumentsHost;
  }

  it('maps a domain error to the standard error envelope', () => {
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };

    RequestContext.run({ requestId: 'req-1', correlationId: 'req-1' }, () => {
      filter.catch(new ItemClosedError(), hostFor(response));
    });

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      data: null,
      errorCode: 'Item is closed',
      message: 'Item is closed',
      status: false,
    });
  });

  it('maps a validation exception to HTTP 400 and keeps its message', () => {
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };

    RequestContext.run({ requestId: 'req-2', correlationId: 'req-2' }, () => {
      filter.catch(new ValidationException('Mã PIN không được để trống.'), hostFor(response));
    });

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      data: null,
      errorCode: 'Mã PIN không được để trống.',
      message: 'Mã PIN không được để trống.',
      status: false,
    });
  });

  it('hides unexpected failures behind an internal error', () => {
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };

    filter.catch(new Error('password=secret'), hostFor(response));

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      data: null,
      errorCode: 'Internal server error',
      message: 'Internal server error',
      status: false,
    });
  });

  it('does not write an unexpected error message to logs', () => {
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    filter.catch(new Error('password=secret'), hostFor(response));

    expect(log).toHaveBeenCalledOnce();
    expect(JSON.stringify(log.mock.calls)).not.toContain('password=secret');
    log.mockRestore();
  });

  it('keeps the status of an http exception', () => {
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };

    filter.catch(new BadRequestException('port is invalid'), hostFor(response));

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      data: null,
      errorCode: 'port is invalid',
      message: 'port is invalid',
      status: false,
    });
  });
});
