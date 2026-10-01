import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { EntityManager } from 'typeorm';

@Injectable()
export class TypeOrmTransactionContext {
  private readonly storage = new AsyncLocalStorage<EntityManager>();

  run<T>(manager: EntityManager, work: () => Promise<T>): Promise<T> {
    return this.storage.run(manager, work);
  }

  getManager(): EntityManager | undefined {
    return this.storage.getStore();
  }

  isInTransaction(): boolean {
    return this.storage.getStore() !== undefined;
  }
}
