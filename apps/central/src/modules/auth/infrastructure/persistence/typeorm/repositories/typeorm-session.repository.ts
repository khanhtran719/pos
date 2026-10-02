import { TypeOrmRepositoryProvider } from '@infrastructure';
import { Injectable } from '@nestjs/common';
import { IsNull, MoreThan } from 'typeorm';
import type {
  ActiveSession,
  CreateSessionInput,
  RotateSessionInput,
  SessionRepository,
} from '../../../../application/ports/session.repository';
import { SessionOrmEntity } from '../entities/session.orm-entity';

@Injectable()
export class TypeOrmSessionRepository implements SessionRepository {
  constructor(private readonly repositories: TypeOrmRepositoryProvider) {}

  private get repository() {
    return this.repositories.getRepository(SessionOrmEntity);
  }

  async create(input: CreateSessionInput): Promise<void> {
    await this.repository.save(
      this.repository.create({
        id: input.id,
        userId: input.userId,
        refreshTokenFingerprint: input.refreshTokenFingerprint,
        expiresAt: input.expiresAt,
        rotatedAt: null,
        revokedAt: null,
      }),
    );
  }

  async findActiveForUpdate(sessionId: string): Promise<ActiveSession | null> {
    const row = await this.repository
      .createQueryBuilder('session')
      .where('session.id = :sessionId', { sessionId })
      .andWhere('session.revokedAt IS NULL')
      .setLock('pessimistic_write')
      .getOne();

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      userId: row.userId,
      refreshTokenFingerprint: row.refreshTokenFingerprint,
      expiresAt: row.expiresAt,
    };
  }

  async rotate(input: RotateSessionInput): Promise<void> {
    await this.repository.update(
      { id: input.sessionId, revokedAt: IsNull() },
      {
        refreshTokenFingerprint: input.refreshTokenFingerprint,
        expiresAt: input.expiresAt,
        rotatedAt: new Date(),
      },
    );
  }

  async revoke(sessionId: string, userId: string): Promise<void> {
    await this.repository.update(
      { id: sessionId, userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async isActive(sessionId: string, userId: string): Promise<boolean> {
    return this.repository.exists({
      where: {
        id: sessionId,
        userId,
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });
  }
}
