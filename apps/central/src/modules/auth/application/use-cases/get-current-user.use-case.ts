import { Inject, Injectable } from '@nestjs/common';
import { EntityStatus } from '@shared';

import {
  USER_FACADE_PORT,
  type UserFacadePort,
  type UserInformation,
} from '../../../user/application/ports/user-facade.port';
import { InvalidSessionError } from '../errors/invalid-session.error';

@Injectable()
export class GetCurrentUserUseCase {
  constructor(@Inject(USER_FACADE_PORT) private readonly users: UserFacadePort) {}

  async execute(userId: string): Promise<UserInformation> {
    const user = await this.users.findById(userId);

    if (!user || user.status !== EntityStatus.ACTIVE) {
      throw new InvalidSessionError();
    }

    return user;
  }
}
