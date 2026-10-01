import { Inject, Injectable, Logger } from '@nestjs/common';
import type { CachePort } from '@shared';

import { REDIS_CACHE_CLIENT, type RedisCacheClient } from './redis-cache.client';

@Injectable()
export class RedisCacheAdapter implements CachePort {
  private readonly logger = new Logger(RedisCacheAdapter.name);

  constructor(@Inject(REDIS_CACHE_CLIENT) private readonly redis: RedisCacheClient) {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const raw = await this.redis.get(key);

      if (raw === null) {
        return undefined;
      }

      return JSON.parse(raw) as T;
    } catch (error) {
      this.logFailure('redis_cache_get_failed', key, error);
      return undefined;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1) {
      throw new Error('ttlSeconds must be a positive integer');
    }

    if (value === undefined) {
      return;
    }

    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.logFailure('redis_cache_set_failed', key, error);
    }
  }

  async invalidate(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logFailure('redis_cache_invalidate_failed', key, error);
    }
  }

  private logFailure(event: string, key: string, error: unknown): void {
    this.logger.warn(
      JSON.stringify({
        event,
        key,
        message: error instanceof Error ? error.message : 'unknown redis error',
      }),
    );
  }
}
