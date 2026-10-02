import { Inject, Injectable } from '@nestjs/common';
import { UNIT_OF_WORK, type UnitOfWork } from '@shared';

import { SESSION_REPOSITORY, type SessionRepository } from '../ports/session.repository';

export interface LogoutCommand {
  readonly userId: string;
  readonly sessionId: string;
}

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    await this.unitOfWork.transaction(() =>
      this.sessions.revoke(command.sessionId, command.userId),
    );
  }
}
