import { Module, type DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UNIT_OF_WORK } from '@shared';

import type { DatabaseEnvironment } from '../config/environment';
import { TypeOrmRepositoryProvider } from './typeorm-repository-provider';
import { TypeOrmTransactionContext } from './typeorm-transaction-context';
import { TypeOrmUnitOfWork } from './typeorm-unit-of-work';

@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    return {
      module: DatabaseModule,
      global: true,
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => {
            const database = config.getOrThrow<DatabaseEnvironment>('database');

            return {
              type: 'postgres' as const,
              host: database.host,
              port: database.port,
              username: database.username,
              password: database.password,
              database: database.name,
              autoLoadEntities: true,
              synchronize: false,
            };
          },
        }),
      ],
      providers: [
        TypeOrmTransactionContext,
        TypeOrmUnitOfWork,
        TypeOrmRepositoryProvider,
        {
          provide: UNIT_OF_WORK,
          useExisting: TypeOrmUnitOfWork,
        },
      ],
      exports: [UNIT_OF_WORK, TypeOrmRepositoryProvider],
    };
  }
}
