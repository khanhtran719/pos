import { Inject, Injectable } from '@nestjs/common';
import { UNIT_OF_WORK, type UnitOfWork } from '@shared';

import {
  USER_FACADE_PORT,
  type UserFacadePort,
} from '../../../user/application/ports/user-facade.port';
import type { TokenResult } from '../dto/auth-result';
import { InvalidSessionError } from '../errors/invalid-session.error';
import { AUTH_TOKEN_SERVICE, type AuthTokenService } from '../ports/auth-token.service';
import { CLOCK, type Clock } from '../ports/clock.port';
import { SESSION_REPOSITORY, type SessionRepository } from '../ports/session.repository';

@Injectable()
export class RefreshSessionUseCase {
  constructor(
    @Inject(AUTH_TOKEN_SERVICE) private readonly tokens: AuthTokenService,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(USER_FACADE_PORT) private readonly users: UserFacadePort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(refreshToken: string): Promise<TokenResult> {
    const principal = await this.verifyToken(refreshToken);

    const result = await this.unitOfWork.transaction<TokenResult | null>(async () => {
      const session = await this.sessions.findActiveForUpdate(principal.sessionId);
      if (!session || session.userId !== principal.userId) {
        return null;
      }

      const validRefresh =
        session.expiresAt.getTime() > this.clock.now().getTime() &&
        this.tokens.matchesFingerprint(refreshToken, session.refreshTokenFingerprint);
      const activeUser = validRefresh && (await this.users.canAuthenticate(principal.userId));

      if (!validRefresh || !activeUser) {
        await this.sessions.revoke(principal.sessionId, principal.userId);
        return null;
      }

      const pair = await this.tokens.issuePair(principal);
      await this.sessions.rotate({
        sessionId: principal.sessionId,
        refreshTokenFingerprint: this.tokens.fingerprint(pair.refreshToken),
        expiresAt: pair.refreshExpiresAt,
      });

      return {
        accessToken: pair.accessToken,
        refreshToken: pair.refreshToken,
        tokenType: 'Bearer',
        expiresIn: pair.accessExpiresIn,
      };
    });

    if (!result) {
      throw new InvalidSessionError();
    }

    return result;
  }

  private async verifyToken(refreshToken: string) {
    try {
      return await this.tokens.verifyRefreshToken(refreshToken);
    } catch {
      throw new InvalidSessionError();
    }
  }
}
