export const AUTH_TOKEN_SERVICE = Symbol('AUTH_TOKEN_SERVICE');

export interface AuthPrincipal {
  readonly userId: string;
  readonly sessionId: string;
}

export interface IssuedTokenPair {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly accessExpiresIn: number;
  readonly refreshExpiresAt: Date;
}

export interface AuthTokenService {
  issuePair(principal: AuthPrincipal): Promise<IssuedTokenPair>;
  verifyAccessToken(token: string): Promise<AuthPrincipal>;
  verifyRefreshToken(token: string): Promise<AuthPrincipal>;
  fingerprint(token: string): string;
  matchesFingerprint(token: string, fingerprint: string): boolean;
}
