import type { DataSource, EntityManager } from 'typeorm';
import { vi } from 'vitest';

import { TypeOrmTransactionContext } from '../typeorm-transaction-context';
import { TypeOrmUnitOfWork } from '../typeorm-unit-of-work';

describe('TypeOrmUnitOfWork', () => {
  it('opens one database transaction and runs the work inside it', async () => {
    const context = new TypeOrmTransactionContext();
    const manager = { name: 'manager' } as unknown as EntityManager;
    const dataSource = {
      transaction: vi.fn((work: (current: EntityManager) => Promise<unknown>) =>
        work(manager),
      ),
    } as unknown as DataSource;
    const unitOfWork = new TypeOrmUnitOfWork(dataSource, context);
    let seenInside = false;

    await unitOfWork.transaction(async () => {
      seenInside = context.isInTransaction();
      expect(context.getManager()).toBe(manager);
    });

    expect(seenInside).toBe(true);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(context.isInTransaction()).toBe(false);
  });

  it('joins the current transaction instead of opening another', async () => {
    const context = new TypeOrmTransactionContext();
    const manager = { name: 'manager' } as unknown as EntityManager;
    const dataSource = {
      transaction: vi.fn(),
    } as unknown as DataSource;
    const unitOfWork = new TypeOrmUnitOfWork(dataSource, context);

    await context.run(manager, () =>
      unitOfWork.transaction(async () => undefined),
    );

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
