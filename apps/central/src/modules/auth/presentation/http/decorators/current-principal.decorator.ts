import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthPrincipal } from '../../../application/ports/auth-token.service';
import type { AuthenticatedRequest } from '../guards/access-token.guard';

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthPrincipal => {
    const principal = context.switchToHttp().getRequest<AuthenticatedRequest>().user;

    if (!principal) {
      throw new Error('Authenticated principal is missing');
    }

    return principal;
  },
);
