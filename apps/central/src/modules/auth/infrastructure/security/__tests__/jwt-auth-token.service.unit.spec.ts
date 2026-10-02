import { JwtService } from '@nestjs/jwt';

import { JwtAuthTokenService } from '../jwt-auth-token.service';

describe('JwtAuthTokenService', () => {
  const service = new JwtAuthTokenService(new JwtService(), {
    accessTokenSecret: 'access-secret-at-least-32-characters',
    accessTokenExpiresIn: '15m',
    refreshTokenSecret: 'refresh-secret-at-least-32-characters',
    refreshTokenExpiresIn: '7d',
  });

  it('issues typed access and refresh tokens for one session', async () => {
    const pair = await service.issuePair({ userId: 'user-1', sessionId: 'session-1' });

    await expect(service.verifyAccessToken(pair.accessToken)).resolves.toEqual({
      userId: 'user-1',
      sessionId: 'session-1',
    });
    await expect(service.verifyRefreshToken(pair.refreshToken)).resolves.toEqual({
      userId: 'user-1',
      sessionId: 'session-1',
    });
    await expect(service.verifyAccessToken(pair.refreshToken)).rejects.toThrow();
    expect(pair.accessExpiresIn).toBeGreaterThan(0);
    expect(pair.refreshExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('compares refresh-token fingerprints without storing the token', async () => {
    const pair = await service.issuePair({ userId: 'user-1', sessionId: 'session-1' });
    const fingerprint = service.fingerprint(pair.refreshToken);

    expect(fingerprint).not.toContain(pair.refreshToken);
    expect(service.matchesFingerprint(pair.refreshToken, fingerprint)).toBe(true);
    expect(service.matchesFingerprint(`${pair.refreshToken}x`, fingerprint)).toBe(false);
  });
});
