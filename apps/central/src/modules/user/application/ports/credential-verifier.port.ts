export const CREDENTIAL_VERIFIER = Symbol('USER_CREDENTIAL_VERIFIER');

export interface CredentialVerifier {
  verify(value: string, storedHash: string): Promise<boolean>;
}
