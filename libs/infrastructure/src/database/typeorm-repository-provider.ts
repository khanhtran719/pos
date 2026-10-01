import { Injectable } from '@nestjs/common';
import { DataSource, type EntityTarget, type ObjectLiteral, type Repository } from 'typeorm';

import { TypeOrmTransactionContext } from './typeorm-transaction-context';

@Injectable()
export class TypeOrmRepositoryProvider {
  constructor(
    private readonly dataSource: DataSource,
    private readonly transactionContext: TypeOrmTransactionContext,
  ) {}

  getRepository<T extends ObjectLiteral>(entity: EntityTarget<T>): Repository<T> {
    const manager = this.transactionContext.getManager();

    if (manager) {
      return manager.getRepository(entity);
    }

    return this.dataSource.getRepository(entity);
  }
}
