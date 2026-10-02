import { Injectable } from '@nestjs/common';
import { compare } from 'bcryptjs';

import type { CredentialVerifier } from '../../application/ports/credential-verifier.port';

@Injectable()
export class BcryptCredentialVerifierAdapter implements CredentialVerifier {
  verify(value: string, storedHash: string): Promise<boolean> {
    return compare(value, storedHash);
  }
}
