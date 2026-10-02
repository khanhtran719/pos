import { randomUUID } from 'node:crypto';

import { TypeOrmRepositoryProvider } from '@infrastructure';
import type { UnitOfWork } from '@shared';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { UserFacadePort } from '../../src/modules/user/application/ports/user-facade.port';
import { InvalidSessionError } from '../../src/modules/auth/application/errors/invalid-session.error';
import type { AuthTokenService } from '../../src/modules/auth/application/ports/auth-token.service';
import type { Clock } from '../../src/modules/auth/application/ports/clock.port';
import { RefreshSessionUseCase } from '../../src/modules/auth/application/use-cases/refresh-session.use-case';
import { SessionOrmEntity } from '../../src/modules/auth/infrastructure/persistence/typeorm/entities/session.orm-entity';
import { TypeOrmSessionRepository } from '../../src/modules/auth/infrastructure/persistence/typeorm/repositories/typeorm-session.repository';
import { TypeOrmTransactionContext } from '../../../../libs/infrastructure/src/database/transaction/typeorm-transaction-context';
import { TypeOrmUnitOfWork } from '../../../../libs/infrastructure/src/database/transaction/typeorm-unit-of-work';

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('TEST_DATABASE_URL is required for PostgreSQL integration tests');
}

describe('authentication session persistence', () => {
  const schema = `auth_test_${randomUUID().replaceAll('-', '')}`;
  let administrationDataSource: DataSource;
  let applicationDataSource: DataSource;
  let sessions: TypeOrmSessionRepository;
  let unitOfWork: UnitOfWork;

  beforeAll(async () => {
    administrationDataSource = new DataSource({ type: 'postgres', url: databaseUrl });
    await administrationDataSource.initialize();
    await administrationDataSource.query(`CREATE SCHEMA "${schema}"`);

    applicationDataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      schema,
      entities: [SessionOrmEntity],
      synchronize: true,
    });
    await applicationDataSource.initialize();

    const transactionContext = new TypeOrmTransactionContext();
    const repositories = new TypeOrmRepositoryProvider(applicationDataSource, transactionContext);
    sessions = new TypeOrmSessionRepository(repositories);
    unitOfWork = new TypeOrmUnitOfWork(applicationDataSource, transactionContext);
  });

  afterAll(async () => {
    if (applicationDataSource?.isInitialized) {
      await applicationDataSource.destroy();
    }
    if (administrationDataSource?.isInitialized) {
      await administrationDataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await administrationDataSource.destroy();
    }
  });

  it('allows only one concurrent rotation of the same refresh token', async () => {
    const sessionId = randomUUID();
    const userId = randomUUID();
    await sessions.create({
      id: sessionId,
      userId,
      refreshTokenFingerprint: 'original-fingerprint',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    });

    let issuedPair = 0;
    const tokens: AuthTokenService = {
      verifyAccessToken: vi.fn(),
      verifyRefreshToken: vi.fn().mockResolvedValue({ sessionId, userId }),
      matchesFingerprint: vi
        .fn()
        .mockImplementation((_token, fingerprint) => fingerprint === 'original-fingerprint'),
      issuePair: vi.fn().mockImplementation(async () => {
        issuedPair += 1;
        return {
          accessToken: `access-${issuedPair}`,
          refreshToken: `refresh-${issuedPair}`,
          accessExpiresIn: 900,
          refreshExpiresAt: new Date('2030-01-02T00:00:00.000Z'),
        };
      }),
      fingerprint: vi.fn().mockImplementation((token) => `fingerprint-${token}`),
    };
    const users = {
      canAuthenticate: vi.fn().mockResolvedValue(true),
    } as unknown as UserFacadePort;
    const clock: Clock = { now: () => new Date('2026-10-01T00:00:00.000Z') };
    const refresh = new RefreshSessionUseCase(tokens, sessions, users, unitOfWork, clock);

    const results = await Promise.allSettled([
      refresh.execute('same-refresh-token'),
      refresh.execute('same-refresh-token'),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejection = results.find((result) => result.status === 'rejected');
    expect(rejection).toMatchObject({ reason: expect.any(InvalidSessionError) });
    expect(tokens.issuePair).toHaveBeenCalledOnce();

    const stored = await applicationDataSource.getRepository(SessionOrmEntity).findOneByOrFail({
      id: sessionId,
    });
    expect(stored.refreshTokenFingerprint).not.toBe('original-fingerprint');
    expect(stored.revokedAt).toBeInstanceOf(Date);
  });
});
