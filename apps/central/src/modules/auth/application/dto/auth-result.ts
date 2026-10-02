import type { UserInformation } from '../../../user/application/ports/user-facade.port';

export interface TokenResult {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly tokenType: 'Bearer';
  readonly expiresIn: number;
}

export interface LoginResult extends TokenResult {
  readonly user: UserInformation;
}
