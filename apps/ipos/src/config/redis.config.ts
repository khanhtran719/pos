import { registerAs } from '@nestjs/config';
import { buildRedisConfig } from '@infrastructure';

export const redisConfig = registerAs('redis', () => buildRedisConfig());
