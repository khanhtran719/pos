export class TokenResponseDto {
  readonly accessToken!: string;
  readonly refreshToken!: string;
  readonly tokenType!: 'Bearer';
  readonly expiresIn!: number;
}
