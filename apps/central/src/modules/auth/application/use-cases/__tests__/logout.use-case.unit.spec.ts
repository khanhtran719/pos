import { vi } from 'vitest';

import type { SessionRepository } from '../../ports/session.repository';
import { LogoutUseCase } from '../logout.use-case';

describe('LogoutUseCase', () => {
  it('revokes only the caller session and remains idempotent at the repository boundary', async () => {
    const sessions = {
      revoke: vi.fn().mockResolvedValue(undefined),
    } as unknown as SessionRepository;
    const useCase = new LogoutUseCase(sessions, { transaction: (work) => work() });

    await expect(
      useCase.execute({ userId: 'user-1', sessionId: 'session-1' }),
    ).resolves.toBeUndefined();
    expect(sessions.revoke).toHaveBeenCalledWith('session-1', 'user-1');
  });
});
