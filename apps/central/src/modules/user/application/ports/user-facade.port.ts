import { UserInformation } from '../dto/user-information';

export const USER_FACADE_PORT = Symbol('USER_FACADE_PORT');

export interface UserFacadePort {
  findById(id: string): Promise<UserInformation | null>;
  authenticate(sale: string, pin: string): Promise<UserInformation | null>;
  canAuthenticate(id: string): Promise<boolean>;
}

export type { UserInformation };
