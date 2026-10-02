import { vi } from 'vitest';

import type { CredentialVerifier } from '../../ports/credential-verifier.port';
import type { UserRepository } from '../../ports/user.repository';
import { UserFacade } from '../user.facade';

describe('UserFacade', () => {
  it('delegates the user lookup to its application repository port', async () => {
    const repository: UserRepository = {
      findById: vi.fn().mockResolvedValue(null),
      findForAuthentication: vi.fn(),
      canAuthenticate: vi.fn(),
    };
    const credentials = { verify: vi.fn() } as CredentialVerifier;
    const facade = new UserFacade(repository, credentials);

    await expect(facade.findById('user-1')).resolves.toBeNull();
    expect(repository.findById).toHaveBeenCalledWith('user-1');
  });

  it('authenticates an active unlocked user without exposing the PIN hash', async () => {
    const repository: UserRepository = {
      findById: vi.fn(),
      findForAuthentication: vi.fn().mockResolvedValue({
        id: 'user-1',
        code: 'NV001',
        sale: 'sale-1',
        name: 'Nguyễn Văn A',
        status: 1,
        locked: false,
        pinHash: 'stored-pin-hash',
      }),
      canAuthenticate: vi.fn(),
    };
    const credentials: CredentialVerifier = {
      verify: vi.fn().mockResolvedValue(true),
    };

    await expect(
      new UserFacade(repository, credentials).authenticate('sale-1', '1234'),
    ).resolves.toEqual({
      id: 'user-1',
      code: 'NV001',
      sale: 'sale-1',
      name: 'Nguyễn Văn A',
      status: 1,
    });
    expect(credentials.verify).toHaveBeenCalledWith('1234', 'stored-pin-hash');
  });

  it('performs a dummy verification and returns null for an unknown user', async () => {
    const repository: UserRepository = {
      findById: vi.fn(),
      findForAuthentication: vi.fn().mockResolvedValue(null),
      canAuthenticate: vi.fn(),
    };
    const credentials: CredentialVerifier = {
      verify: vi.fn().mockResolvedValue(false),
    };

    await expect(
      new UserFacade(repository, credentials).authenticate('missing', '1234'),
    ).resolves.toBeNull();
    expect(credentials.verify).toHaveBeenCalledOnce();
    expect(credentials.verify).toHaveBeenCalledWith('1234', expect.any(String));
  });
});
