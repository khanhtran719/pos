import { UserInformation } from '../../application/dto/user-information';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findById(id: string): Promise<UserInformation | null>;
}
