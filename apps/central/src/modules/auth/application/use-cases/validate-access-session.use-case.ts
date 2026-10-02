import { Inject, Injectable } from '@nestjs/common';

import {
  USER_FACADE_PORT,
  type UserFacadePort,
} from '../../../user/application/ports/user-facade.port';
import { InvalidSessionError } from '../errors/invalid-session.error';
import type { AuthPrincipal } from '../ports/auth-token.service';
import { SESSION_REPOSITORY, type SessionRepository } from '../ports/session.repository';

@Injectable()
export class ValidateAccessSessionUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(USER_FACADE_PORT) private readonly users: UserFacadePort,
  ) {}

  async execute(principal: AuthPrincipal): Promise<void> {
    const [activeSession, activeUser] = await Promise.all([
      this.sessions.isActive(principal.sessionId, principal.userId),
      this.users.canAuthenticate(principal.userId),
    ]);

    if (!activeSession || !activeUser) {
      throw new InvalidSessionError();
    }
  }
}
