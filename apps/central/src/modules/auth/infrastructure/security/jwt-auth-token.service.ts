import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

import type { JwtSignOptions } from '@nestjs/jwt';
import { JwtService } from '@nestjs/jwt';

import type {
  AuthPrincipal,
  AuthTokenService,
  IssuedTokenPair,
} from '../../application/ports/auth-token.service';

export interface JwtAuthOptions {
  readonly accessTokenSecret: string;
  readonly accessTokenExpiresIn: string;
  readonly refreshTokenSecret: string;
  readonly refreshTokenExpiresIn: string;
}

interface TokenPayload {
  readonly sub: string;
  readonly sid: string;
  readonly typ: 'access' | 'refresh';
  readonly exp: number;
}

export class JwtAuthTokenService implements AuthTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly options: JwtAuthOptions,
  ) {}

  async issuePair(principal: AuthPrincipal): Promise<IssuedTokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: principal.userId, sid: principal.sessionId, typ: 'access', jti: randomUUID() },
        {
          secret: this.options.accessTokenSecret,
          expiresIn: this.options.accessTokenExpiresIn as JwtSignOptions['expiresIn'],
        },
      ),
      this.jwt.signAsync(
        { sub: principal.userId, sid: principal.sessionId, typ: 'refresh', jti: randomUUID() },
        {
          secret: this.options.refreshTokenSecret,
          expiresIn: this.options.refreshTokenExpiresIn as JwtSignOptions['expiresIn'],
        },
      ),
    ]);
    const accessPayload = this.jwt.decode<TokenPayload>(accessToken);
    const refreshPayload = this.jwt.decode<TokenPayload>(refreshToken);
    const now = Math.floor(Date.now() / 1000);

    return {
      accessToken,
      refreshToken,
      accessExpiresIn: Math.max(1, accessPayload.exp - now),
      refreshExpiresAt: new Date(refreshPayload.exp * 1000),
    };
  }

  async verifyAccessToken(token: string): Promise<AuthPrincipal> {
    return this.verify(token, 'access', this.options.accessTokenSecret);
  }

  async verifyRefreshToken(token: string): Promise<AuthPrincipal> {
    return this.verify(token, 'refresh', this.options.refreshTokenSecret);
  }

  fingerprint(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  matchesFingerprint(token: string, fingerprint: string): boolean {
    const actual = Buffer.from(this.fingerprint(token), 'hex');
    const expected = Buffer.from(fingerprint, 'hex');

    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  private async verify(
    token: string,
    expectedType: TokenPayload['typ'],
    secret: string,
  ): Promise<AuthPrincipal> {
    const payload = await this.jwt.verifyAsync<TokenPayload>(token, { secret });

    if (
      payload.typ !== expectedType ||
      typeof payload.sub !== 'string' ||
      payload.sub === '' ||
      typeof payload.sid !== 'string' ||
      payload.sid === ''
    ) {
      throw new Error('Invalid token payload');
    }

    return { userId: payload.sub, sessionId: payload.sid };
  }
}
