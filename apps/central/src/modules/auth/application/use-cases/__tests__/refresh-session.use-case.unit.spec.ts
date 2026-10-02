import { type UnitOfWork } from '@shared';
import { vi } from 'vitest';

import type { UserFacadePort } from '../../../../user/application/ports/user-facade.port';
import { InvalidSessionError } from '../../errors/invalid-session.error';
import type { AuthTokenService } from '../../ports/auth-token.service';
import type { Clock } from '../../ports/clock.port';
import type { SessionRepository } from '../../ports/session.repository';
import { RefreshSessionUseCase } from '../refresh-session.use-case';

describe('RefreshSessionUseCase', () => {
  it('rotates the refresh-token fingerprint while holding the session lock', async () => {
    const sessionRepository: SessionRepository = {
      create: vi.fn(),
      findActiveForUpdate: vi.fn().mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        refreshTokenFingerprint: 'old-fingerprint',
        expiresAt: new Date('2026-10-08T00:00:00.000Z'),
      }),
      revoke: vi.fn().mockResolvedValue(undefined),
      rotate: vi.fn().mockResolvedValue(undefined),
      isActive: vi.fn(),
    };
    const tokenService: AuthTokenService = {
      fingerprint: vi.fn().mockReturnValue('new-fingerprint'),
      issuePair: vi.fn().mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        accessExpiresIn: 900,
        refreshExpiresAt: new Date('2026-10-09T00:00:00.000Z'),
      }),
      matchesFingerprint: vi.fn().mockReturnValue(true),
      verifyAccessToken: vi.fn(),
      verifyRefreshToken: vi.fn().mockResolvedValue({ userId: 'user-1', sessionId: 'session-1' }),
    };
    const userFacade: UserFacadePort = {
      findById: vi.fn(),
      authenticate: vi.fn(),
      canAuthenticate: vi.fn().mockResolvedValue(true),
    };
    const unitOfWork: UnitOfWork = { transaction: (work) => work() };
    const useCase = new RefreshSessionUseCase(
      tokenService,
      sessionRepository,
      userFacade,
      unitOfWork,
      { now: () => new Date('2026-10-01T00:00:00.000Z') } satisfies Clock,
    );

    await expect(useCase.execute('old-refresh')).resolves.toEqual({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      tokenType: 'Bearer',
      expiresIn: 900,
    });
    expect(sessionRepository.rotate).toHaveBeenCalledWith({
      sessionId: 'session-1',
      refreshTokenFingerprint: 'new-fingerprint',
      expiresAt: new Date('2026-10-09T00:00:00.000Z'),
    });
  });

  it('rejects a reused refresh token without rotating the session', async () => {
    const sessionRepository: SessionRepository = {
      create: vi.fn(),
      findActiveForUpdate: vi.fn().mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        refreshTokenFingerprint: 'current-fingerprint',
        expiresAt: new Date('2026-10-08T00:00:00.000Z'),
      }),
      revoke: vi.fn(),
      rotate: vi.fn(),
      isActive: vi.fn(),
    };
    const tokenService = {
      verifyRefreshToken: vi.fn().mockResolvedValue({ userId: 'user-1', sessionId: 'session-1' }),
      matchesFingerprint: vi.fn().mockReturnValue(false),
    } as unknown as AuthTokenService;
    const userFacade = { canAuthenticate: vi.fn() } as unknown as UserFacadePort;
    const useCase = new RefreshSessionUseCase(
      tokenService,
      sessionRepository,
      userFacade,
      {
        transaction: (work) => work(),
      },
      { now: () => new Date('2026-10-01T00:00:00.000Z') },
    );

    await expect(useCase.execute('reused-refresh')).rejects.toBeInstanceOf(InvalidSessionError);
    expect(sessionRepository.revoke).toHaveBeenCalledWith('session-1', 'user-1');
    expect(sessionRepository.rotate).not.toHaveBeenCalled();
  });

  it('uses the injected clock when deciding whether the session is expired', async () => {
    const sessionRepository = {
      findActiveForUpdate: vi.fn().mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        refreshTokenFingerprint: 'fingerprint',
        expiresAt: new Date('2020-01-02T00:00:00.000Z'),
      }),
      revoke: vi.fn(),
      rotate: vi.fn(),
    } as unknown as SessionRepository;
    const tokenService = {
      verifyRefreshToken: vi.fn().mockResolvedValue({ userId: 'user-1', sessionId: 'session-1' }),
      matchesFingerprint: vi.fn().mockReturnValue(true),
      issuePair: vi.fn().mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
        accessExpiresIn: 900,
        refreshExpiresAt: new Date('2020-01-03T00:00:00.000Z'),
      }),
      fingerprint: vi.fn().mockReturnValue('new-fingerprint'),
    } as unknown as AuthTokenService;
    const users = { canAuthenticate: vi.fn().mockResolvedValue(true) } as unknown as UserFacadePort;

    const result = new RefreshSessionUseCase(
      tokenService,
      sessionRepository,
      users,
      { transaction: (work) => work() },
      { now: () => new Date('2020-01-01T00:00:00.000Z') },
    ).execute('refresh');

    await expect(result).resolves.toMatchObject({ accessToken: 'access' });
  });
});
