import { EntityStatus } from '@shared';
import { UserInformation } from '../../../../application/dto/user-information';

export class UserMapper {
  static toInformation(
    id: string,
    code: string,
    sale: string,
    name: string,
    status: EntityStatus,
  ): UserInformation {
    return {
      id,
      code,
      sale,
      name,
      status,
    };
  }
}
