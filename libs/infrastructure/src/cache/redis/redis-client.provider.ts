import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import type { RedisEnvironment } from '../../config/environment';

@Injectable()
export class RedisClientProvider implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisClientProvider.name);
  readonly client: Redis;

  constructor(config: ConfigService) {
    const redis = config.getOrThrow<RedisEnvironment>('redis');

    this.client = new Redis({
      host: redis.host,
      port: redis.port,
      password: redis.password,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 1_000,
      commandTimeout: 500,
      enableOfflineQueue: false,
      retryStrategy: (times: number) => Math.min(times * 200, 2_000),
    });

    this.client.on('error', () => {
      this.logger.warn(
        JSON.stringify({
          event: 'redis_client_error',
          errorType: 'redis_error',
        }),
      );
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
    } catch {
      this.logger.warn(
        JSON.stringify({
          event: 'redis_connect_failed',
          errorType: 'redis_error',
        }),
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }
}
