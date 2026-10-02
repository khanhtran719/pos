import { Inject, Injectable } from '@nestjs/common';
import { UNIT_OF_WORK, type UnitOfWork } from '@shared';

import {
  USER_FACADE_PORT,
  type UserFacadePort,
} from '../../../user/application/ports/user-facade.port';
import type { LoginResult } from '../dto/auth-result';
import { InvalidCredentialsError } from '../errors/invalid-credentials.error';
import { AUTH_TOKEN_SERVICE, type AuthTokenService } from '../ports/auth-token.service';
import { ID_GENERATOR, type IdGenerator } from '../ports/id-generator';
import { SESSION_REPOSITORY, type SessionRepository } from '../ports/session.repository';

export interface LoginCommand {
  readonly sale: string;
  readonly pin: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_FACADE_PORT) private readonly users: UserFacadePort,
    @Inject(AUTH_TOKEN_SERVICE) private readonly tokens: AuthTokenService,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const user = await this.users.authenticate(command.sale, command.pin);

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const sessionId = this.ids.next();
    const pair = await this.tokens.issuePair({ userId: user.id, sessionId });
    const refreshTokenFingerprint = this.tokens.fingerprint(pair.refreshToken);

    await this.unitOfWork.transaction(() =>
      this.sessions.create({
        id: sessionId,
        userId: user.id,
        refreshTokenFingerprint,
        expiresAt: pair.refreshExpiresAt,
      }),
    );

    return {
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
      tokenType: 'Bearer',
      expiresIn: pair.accessExpiresIn,
      user,
    };
  }
}
