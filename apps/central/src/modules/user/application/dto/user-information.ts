import { EntityStatus } from '@shared';

export class UserInformation {
  constructor(
    readonly id: string,
    readonly code: string,
    readonly sale: string,
    readonly name: string,
    readonly status: EntityStatus,
  ) {}
}
