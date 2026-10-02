import { TypeOrmRepositoryProvider } from '@infrastructure';
import { Injectable } from '@nestjs/common';
import { EntityStatus } from '@shared';
import type { UserAuthenticationRecord } from '../../../../application/dto/user-authentication-record';
import { UserInformation } from '../../../../application/dto/user-information';
import { UserRepository } from '../../../../application/ports/user.repository';
import { UserOrmEntity } from '../entities/user.orm-entity';
import { UserMapper } from '../mappers/user.mapper';

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(private readonly repositories: TypeOrmRepositoryProvider) {}

  private get repo() {
    return this.repositories.getRepository(UserOrmEntity);
  }

  private toInformation(row: UserOrmEntity): UserInformation {
    return UserMapper.toInformation(row.id, row.code, row.sale, row.name, row.status);
  }

  async findById(id: string): Promise<UserInformation | null> {
    const row = await this.repo.findOne({ where: { id, deleted: false } });

    if (!row) {
      return null;
    }

    return this.toInformation(row);
  }

  async findForAuthentication(sale: string): Promise<UserAuthenticationRecord | null> {
    const row = await this.repo
      .createQueryBuilder('user')
      .addSelect('user.pin')
      .where('user.sale = :sale', { sale })
      .andWhere('user.deleted = false')
      .getOne();

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      code: row.code,
      sale: row.sale,
      name: row.name,
      status: row.status,
      locked: row.flagIsLocked,
      pinHash: row.pin,
    };
  }

  async canAuthenticate(id: string): Promise<boolean> {
    return this.repo.exists({
      where: {
        id,
        deleted: false,
        flagIsLocked: false,
        status: EntityStatus.ACTIVE,
      },
    });
  }
}
