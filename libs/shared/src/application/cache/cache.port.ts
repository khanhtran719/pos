export interface CachePort {
  get<T>(key: string): Promise<T | undefined>;

  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;

  invalidate(key: string): Promise<void>;
}
