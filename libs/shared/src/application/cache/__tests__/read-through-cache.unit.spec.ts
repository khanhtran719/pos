import { vi } from 'vitest';

import type { CachePort } from '../cache.port';
import { readThroughCache } from '../read-through-cache';

describe('readThroughCache', () => {
  it('returns the cached value without loading the source', async () => {
    const cache: CachePort = {
      get: vi.fn().mockResolvedValue({ id: 'item-1' }),
      set: vi.fn(),
      invalidate: vi.fn(),
    };
    const load = vi.fn();

    await expect(readThroughCache(cache, 'central:item:detail:item-1', 30, load)).resolves.toEqual({
      id: 'item-1',
    });
    expect(load).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('loads the source on a miss and stores it with the given ttl', async () => {
    const cache: CachePort = {
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
      invalidate: vi.fn(),
    };

    await expect(
      readThroughCache(cache, 'ipos:item:detail:item-2', 60, async () => ({ id: 'item-2' })),
    ).resolves.toEqual({ id: 'item-2' });
    expect(cache.set).toHaveBeenCalledWith('ipos:item:detail:item-2', { id: 'item-2' }, 60);
  });

  it('loads the source when the cache misses because redis is unavailable', async () => {
    const cache: CachePort = {
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
      invalidate: vi.fn(),
    };

    await expect(
      readThroughCache(cache, 'kpos:item:detail:item-3', 15, async () => ({ id: 'item-3' })),
    ).resolves.toEqual({ id: 'item-3' });
  });
});
