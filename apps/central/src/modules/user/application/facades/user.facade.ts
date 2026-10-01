import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../domain/repositories/user.repository';
import { UserInformation } from '../dto/user-information';
import { UserFacadePort } from '../ports/user-facade.port';

@Injectable()
export class UserFacade implements UserFacadePort {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async findById(id: string): Promise<UserInformation | null> {
    return await this.userRepository.findById(id);
  }
}
