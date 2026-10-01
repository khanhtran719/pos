export interface RedisCacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, expiryMode: 'EX', ttlSeconds: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

export const REDIS_CACHE_CLIENT = Symbol('REDIS_CACHE_CLIENT');
