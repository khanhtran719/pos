import { Module, type DynamicModule } from '@nestjs/common';
import { CACHE_PORT } from '@shared';

import { RedisCacheAdapter } from './redis-cache.adapter';
import { REDIS_CACHE_CLIENT } from './redis-cache.client';
import { RedisClientProvider } from './redis-client.provider';
import { RedisKeyFactory } from './redis-key.factory';

@Module({})
export class CacheModule {
  static forRoot(): DynamicModule {
    return {
      module: CacheModule,
      global: true,
      providers: [
        RedisClientProvider,
        {
          provide: REDIS_CACHE_CLIENT,
          useFactory: (provider: RedisClientProvider) => provider.client,
          inject: [RedisClientProvider],
        },
        RedisCacheAdapter,
        {
          provide: CACHE_PORT,
          useExisting: RedisCacheAdapter,
        },
        RedisKeyFactory,
      ],
      exports: [CACHE_PORT, RedisKeyFactory],
    };
  }
}
