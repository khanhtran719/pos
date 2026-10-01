import { UserInformation } from '../dto/user-information';

export const USER_FACADE_PORT = Symbol('USER_FACADE_PORT');

export interface UserFacadePort {
  findById(id: string): Promise<UserInformation | null>;
}
