import type { ExecutionContext } from '@nestjs/common';
import { vi } from 'vitest';

import { InvalidSessionError } from '../../../../application/errors/invalid-session.error';
import type { AuthTokenService } from '../../../../application/ports/auth-token.service';
import type { ValidateAccessSessionUseCase } from '../../../../application/use-cases/validate-access-session.use-case';
import { AccessTokenGuard } from '../access-token.guard';

describe('AccessTokenGuard', () => {
  it('attaches a verified bearer principal to the request', async () => {
    const request: { headers: Record<string, string>; user?: unknown } = {
      headers: { authorization: 'Bearer access-token' },
    };
    const tokens = {
      verifyAccessToken: vi.fn().mockResolvedValue({ userId: 'user-1', sessionId: 'session-1' }),
    } as unknown as AuthTokenService;
    const validateSession = {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as ValidateAccessSessionUseCase;

    await expect(
      new AccessTokenGuard(tokens, validateSession).canActivate(contextFor(request)),
    ).resolves.toBe(true);
    expect(request.user).toEqual({ userId: 'user-1', sessionId: 'session-1' });
  });

  it.each([undefined, 'Basic credentials', 'Bearer '])(
    'rejects a missing or malformed authorization header',
    async (authorization) => {
      const tokens = { verifyAccessToken: vi.fn() } as unknown as AuthTokenService;
      const validateSession = { execute: vi.fn() } as unknown as ValidateAccessSessionUseCase;
      const request = { headers: { authorization } };

      await expect(
        new AccessTokenGuard(tokens, validateSession).canActivate(contextFor(request)),
      ).rejects.toBeInstanceOf(InvalidSessionError);
      expect(tokens.verifyAccessToken).not.toHaveBeenCalled();
    },
  );

  it('maps only token verification failures to an invalid session', async () => {
    const request = { headers: { authorization: 'Bearer invalid-token' } };
    const tokens = {
      verifyAccessToken: vi.fn().mockRejectedValue(new Error('invalid signature')),
    } as unknown as AuthTokenService;
    const validateSession = { execute: vi.fn() } as unknown as ValidateAccessSessionUseCase;

    await expect(
      new AccessTokenGuard(tokens, validateSession).canActivate(contextFor(request)),
    ).rejects.toBeInstanceOf(InvalidSessionError);
  });

  it('does not hide a technical session-validation failure as unauthorized', async () => {
    const databaseFailure = new Error('database unavailable');
    const request = { headers: { authorization: 'Bearer access-token' } };
    const tokens = {
      verifyAccessToken: vi.fn().mockResolvedValue({ userId: 'user-1', sessionId: 'session-1' }),
    } as unknown as AuthTokenService;
    const validateSession = {
      execute: vi.fn().mockRejectedValue(databaseFailure),
    } as unknown as ValidateAccessSessionUseCase;

    await expect(
      new AccessTokenGuard(tokens, validateSession).canActivate(contextFor(request)),
    ).rejects.toBe(databaseFailure);
  });
});

function contextFor(request: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}
