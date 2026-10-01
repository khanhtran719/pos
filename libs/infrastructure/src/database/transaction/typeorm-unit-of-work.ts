import { Injectable } from '@nestjs/common';
import type { UnitOfWork } from '@shared';
import { DataSource } from 'typeorm';

import { TypeOrmTransactionContext } from './typeorm-transaction-context';

@Injectable()
export class TypeOrmUnitOfWork implements UnitOfWork {
  constructor(
    private readonly dataSource: DataSource,
    private readonly context: TypeOrmTransactionContext,
  ) {}

  async transaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.context.isInTransaction()) {
      return work();
    }

    return this.dataSource.transaction((manager) =>
      this.context.run(manager, work),
    );
  }
}
