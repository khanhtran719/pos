import { EntityStatus } from '@shared';
import { Inject, Injectable } from '@nestjs/common';

import { UserInformation } from '../dto/user-information';
import { CREDENTIAL_VERIFIER, type CredentialVerifier } from '../ports/credential-verifier.port';
import { UserFacadePort } from '../ports/user-facade.port';
import type { UserRepository } from '../ports/user.repository';
import { USER_REPOSITORY } from '../ports/user.repository';

@Injectable()
export class UserFacade implements UserFacadePort {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(CREDENTIAL_VERIFIER) private readonly credentials: CredentialVerifier,
  ) {}

  async findById(id: string): Promise<UserInformation | null> {
    return this.userRepository.findById(id);
  }

  async authenticate(sale: string, pin: string): Promise<UserInformation | null> {
    const candidate = await this.userRepository.findForAuthentication(sale);
    const valid = await this.credentials.verify(pin, candidate?.pinHash ?? DUMMY_PIN_HASH);

    if (!candidate || !valid || candidate.locked || candidate.status !== EntityStatus.ACTIVE) {
      return null;
    }

    return new UserInformation(
      candidate.id,
      candidate.code,
      candidate.sale,
      candidate.name,
      candidate.status,
    );
  }

  async canAuthenticate(id: string): Promise<boolean> {
    return this.userRepository.canAuthenticate(id);
  }
}

// A fixed non-user hash keeps unknown-user verification timing close to a normal bcrypt check.
const DUMMY_PIN_HASH = '$2b$12$CRbxvvyiWm5.SlLMcPsFV.NTH52CkNDASeDHgZ3wSNG1iFzS1UrmO';
