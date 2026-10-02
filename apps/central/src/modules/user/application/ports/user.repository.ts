import type { UserAuthenticationRecord } from '../dto/user-authentication-record';
import { UserInformation } from '../dto/user-information';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

/** Read port owned by Application because it returns an application read model. */
export interface UserRepository {
  findById(id: string): Promise<UserInformation | null>;
  findForAuthentication(sale: string): Promise<UserAuthenticationRecord | null>;
  canAuthenticate(id: string): Promise<boolean>;
}
