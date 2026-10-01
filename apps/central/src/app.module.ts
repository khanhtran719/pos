import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule, DatabaseModule, HealthModule, validateEnvironment } from '@infrastructure';

import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/central/.env'],
      load: [appConfig, databaseConfig, redisConfig],
      validate: validateEnvironment,
    }),
    DatabaseModule.forRoot(),
    CacheModule.forRoot(),
    HealthModule,
  ],
})
export class AppModule {}
