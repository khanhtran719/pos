import { vi } from 'vitest';

import type { RedisCacheClient } from '../redis-cache.client';
import { RedisCacheAdapter } from '../redis-cache.adapter';

describe('RedisCacheAdapter', () => {
  function adapter(redis: RedisCacheClient): RedisCacheAdapter {
    return new RedisCacheAdapter(redis);
  }

  it('returns undefined when the key is missing', async () => {
    const redis: RedisCacheClient = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn(),
      del: vi.fn(),
    };

    await expect(adapter(redis).get('central:item:detail:1')).resolves.toBeUndefined();
  });

  it('returns undefined when redis fails on read', async () => {
    const redis: RedisCacheClient = {
      get: vi.fn().mockRejectedValue(new Error('connection is closed')),
      set: vi.fn(),
      del: vi.fn(),
    };

    await expect(adapter(redis).get('central:item:detail:1')).resolves.toBeUndefined();
  });

  it('stores json with an explicit ttl', async () => {
    const redis: RedisCacheClient = {
      get: vi.fn(),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn(),
    };

    await adapter(redis).set('central:item:detail:1', { id: '1' }, 30);

    expect(redis.set).toHaveBeenCalledWith('central:item:detail:1', '{"id":"1"}', 'EX', 30);
  });

  it('rejects a ttl that is not a positive integer', async () => {
    const redis: RedisCacheClient = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };

    await expect(adapter(redis).set('central:item:detail:1', { id: '1' }, 0)).rejects.toThrow(
      'ttlSeconds must be a positive integer',
    );
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('keeps going when invalidation fails', async () => {
    const redis: RedisCacheClient = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn().mockRejectedValue(new Error('connection is closed')),
    };

    await expect(adapter(redis).invalidate('central:item:detail:1')).resolves.toBeUndefined();
  });
});
