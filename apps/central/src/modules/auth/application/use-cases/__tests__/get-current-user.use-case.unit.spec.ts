import { EntityStatus } from '@shared';
import { vi } from 'vitest';

import type { UserFacadePort } from '../../../../user/application/ports/user-facade.port';
import { InvalidSessionError } from '../../errors/invalid-session.error';
import { GetCurrentUserUseCase } from '../get-current-user.use-case';

describe('GetCurrentUserUseCase', () => {
  it('returns the current active user', async () => {
    const user = {
      id: 'user-1',
      code: 'NV001',
      sale: 'sale-1',
      name: 'Nguyễn Văn A',
      status: EntityStatus.ACTIVE,
    };
    const users = { findById: vi.fn().mockResolvedValue(user) } as unknown as UserFacadePort;

    await expect(new GetCurrentUserUseCase(users).execute('user-1')).resolves.toEqual(user);
  });

  it('rejects a removed or inactive user as an invalid session', async () => {
    const users = { findById: vi.fn().mockResolvedValue(null) } as unknown as UserFacadePort;

    await expect(new GetCurrentUserUseCase(users).execute('user-1')).rejects.toBeInstanceOf(
      InvalidSessionError,
    );
  });
});
