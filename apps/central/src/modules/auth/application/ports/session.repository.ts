export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');

export interface ActiveSession {
  readonly id: string;
  readonly userId: string;
  readonly refreshTokenFingerprint: string;
  readonly expiresAt: Date;
}

export type CreateSessionInput = ActiveSession;

export interface RotateSessionInput {
  readonly sessionId: string;
  readonly refreshTokenFingerprint: string;
  readonly expiresAt: Date;
}

export interface SessionRepository {
  create(input: CreateSessionInput): Promise<void>;
  findActiveForUpdate(sessionId: string): Promise<ActiveSession | null>;
  rotate(input: RotateSessionInput): Promise<void>;
  revoke(sessionId: string, userId: string): Promise<void>;
  isActive(sessionId: string, userId: string): Promise<boolean>;
}
