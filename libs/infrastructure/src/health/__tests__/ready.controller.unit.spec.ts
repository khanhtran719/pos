import { ServiceUnavailableException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { vi } from 'vitest';

import { ReadyController } from '../ready.controller';

describe('ReadyController', () => {
  it('reports ok when postgres accepts a query', async () => {
    const dataSource = {
      query: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as DataSource;

    await expect(new ReadyController(dataSource).ready()).resolves.toEqual({ status: 'ok' });
  });

  it('rejects readiness when postgres is unavailable', async () => {
    const dataSource = {
      query: vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED')),
    } as unknown as DataSource;

    await expect(new ReadyController(dataSource).ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
