import { vi } from 'vitest';

import type { UserFacadePort } from '../../../../user/application/ports/user-facade.port';
import { InvalidSessionError } from '../../errors/invalid-session.error';
import type { SessionRepository } from '../../ports/session.repository';
import { ValidateAccessSessionUseCase } from '../validate-access-session.use-case';

describe('ValidateAccessSessionUseCase', () => {
  it('accepts only an active session for an active unlocked user', async () => {
    const sessions = { isActive: vi.fn().mockResolvedValue(true) } as unknown as SessionRepository;
    const users = { canAuthenticate: vi.fn().mockResolvedValue(true) } as unknown as UserFacadePort;

    await expect(
      new ValidateAccessSessionUseCase(sessions, users).execute({
        userId: 'user-1',
        sessionId: 'session-1',
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects a revoked session', async () => {
    const sessions = { isActive: vi.fn().mockResolvedValue(false) } as unknown as SessionRepository;
    const users = { canAuthenticate: vi.fn().mockResolvedValue(true) } as unknown as UserFacadePort;

    await expect(
      new ValidateAccessSessionUseCase(sessions, users).execute({
        userId: 'user-1',
        sessionId: 'session-1',
      }),
    ).rejects.toBeInstanceOf(InvalidSessionError);
  });
});
