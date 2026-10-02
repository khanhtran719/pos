import { EntityStatus } from '@shared';

/** Internal application record. It must not be exported from UserModule. */
export interface UserAuthenticationRecord {
  readonly id: string;
  readonly code: string;
  readonly sale: string;
  readonly name: string;
  readonly status: EntityStatus;
  readonly locked: boolean;
  readonly pinHash: string;
}
