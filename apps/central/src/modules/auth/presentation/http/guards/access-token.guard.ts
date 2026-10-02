import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import { InvalidSessionError } from '../../../application/errors/invalid-session.error';
import {
  AUTH_TOKEN_SERVICE,
  type AuthPrincipal,
  type AuthTokenService,
} from '../../../application/ports/auth-token.service';
import { ValidateAccessSessionUseCase } from '../../../application/use-cases/validate-access-session.use-case';

export interface AuthenticatedRequest extends Request {
  user?: AuthPrincipal;
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    @Inject(AUTH_TOKEN_SERVICE) private readonly tokens: AuthTokenService,
    private readonly validateSession: ValidateAccessSessionUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = bearerToken(request.headers.authorization);

    if (!token) {
      throw new InvalidSessionError();
    }

    const principal = await this.verifyToken(token);
    await this.validateSession.execute(principal);
    request.user = principal;
    return true;
  }

  private async verifyToken(token: string): Promise<AuthPrincipal> {
    try {
      return await this.tokens.verifyAccessToken(token);
    } catch {
      throw new InvalidSessionError();
    }
  }
}

function bearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  const token = header.slice('Bearer '.length).trim();
  return token === '' ? null : token;
}
