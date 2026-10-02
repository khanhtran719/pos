import { EntityStatus, type UnitOfWork } from '@shared';
import { vi } from 'vitest';

import type { UserFacadePort } from '../../../../user/application/ports/user-facade.port';
import { InvalidCredentialsError } from '../../errors/invalid-credentials.error';
import type { AuthTokenService } from '../../ports/auth-token.service';
import type { IdGenerator } from '../../ports/id-generator';
import type { SessionRepository } from '../../ports/session.repository';
import { LoginUseCase } from '../login.use-case';

describe('LoginUseCase', () => {
  it('verifies the PIN and persists only the refresh-token fingerprint', async () => {
    const userFacade: UserFacadePort = {
      findById: vi.fn(),
      authenticate: vi.fn().mockResolvedValue({
        id: 'user-1',
        code: 'NV001',
        sale: 'sale-1',
        name: 'Nguyễn Văn A',
        status: EntityStatus.ACTIVE,
      }),
      canAuthenticate: vi.fn(),
    };
    const tokenService: AuthTokenService = {
      fingerprint: vi.fn().mockReturnValue('refresh-fingerprint'),
      issuePair: vi.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessExpiresIn: 900,
        refreshExpiresAt: new Date('2026-10-08T00:00:00.000Z'),
      }),
      matchesFingerprint: vi.fn(),
      verifyAccessToken: vi.fn(),
      verifyRefreshToken: vi.fn(),
    };
    const sessionRepository: SessionRepository = {
      create: vi.fn().mockResolvedValue(undefined),
      findActiveForUpdate: vi.fn(),
      revoke: vi.fn(),
      rotate: vi.fn(),
      isActive: vi.fn(),
    };
    const unitOfWork: UnitOfWork = {
      transaction: (work) => work(),
    };
    const idGenerator: IdGenerator = { next: vi.fn().mockReturnValue('session-1') };
    const useCase = new LoginUseCase(
      userFacade,
      tokenService,
      sessionRepository,
      unitOfWork,
      idGenerator,
    );

    await expect(useCase.execute({ sale: 'sale-1', pin: '1234' })).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: 'user-1',
        code: 'NV001',
        sale: 'sale-1',
        name: 'Nguyễn Văn A',
        status: EntityStatus.ACTIVE,
      },
    });
    expect(sessionRepository.create).toHaveBeenCalledWith({
      id: 'session-1',
      userId: 'user-1',
      refreshTokenFingerprint: 'refresh-fingerprint',
      expiresAt: new Date('2026-10-08T00:00:00.000Z'),
    });
    expect(
      JSON.stringify((sessionRepository.create as ReturnType<typeof vi.fn>).mock.calls),
    ).not.toContain('refresh-token');
  });

  it('returns the same unauthorized error for an unknown user or invalid PIN', async () => {
    const userFacade: UserFacadePort = {
      findById: vi.fn(),
      authenticate: vi.fn().mockResolvedValue(null),
      canAuthenticate: vi.fn(),
    };
    const useCase = new LoginUseCase(
      userFacade,
      {} as AuthTokenService,
      {} as SessionRepository,
      { transaction: (work) => work() },
      { next: vi.fn() },
    );

    await expect(useCase.execute({ sale: 'missing', pin: 'wrong' })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(userFacade.authenticate).toHaveBeenCalledWith('missing', 'wrong');
  });
});
