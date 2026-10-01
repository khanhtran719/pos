import type { Response } from 'express';
import type { DataSource } from 'typeorm';
import { vi } from 'vitest';

import { ReadyController } from '../ready.controller';

describe('ReadyController', () => {
  it('reports ok when postgres accepts a query', async () => {
    const dataSource = {
      query: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as DataSource;

    const response = { status: vi.fn() } as unknown as Response;

    await expect(new ReadyController(dataSource).ready(response)).resolves.toEqual({
      status: 'ok',
    });
    expect(response.status).not.toHaveBeenCalled();
  });

  it('returns a simple 503 health payload when postgres is unavailable', async () => {
    const dataSource = {
      query: vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED')),
    } as unknown as DataSource;

    const response = {
      status: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await expect(new ReadyController(dataSource).ready(response)).resolves.toEqual({
      status: 'error',
    });
    expect(response.status).toHaveBeenCalledWith(503);
  });
});
