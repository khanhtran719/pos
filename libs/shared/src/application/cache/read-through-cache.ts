import type { CachePort } from './cache.port';

/**
 * Cache-aside read. Redis is not the source of truth.
 * A miss, a corrupt entry, or a Redis failure loads from the caller.
 * A value stays stale at most `ttlSeconds` when invalidation does not run.
 */
export async function readThroughCache<T>(
  cache: CachePort,
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
): Promise<T> {
  const cached = await cache.get<T>(key);

  if (cached !== undefined) {
    return cached;
  }

  const loaded = await load();

  if (loaded !== undefined) {
    await cache.set(key, loaded, ttlSeconds);
  }

  return loaded;
}
