import { TypeOrmRepositoryProvider } from '@infrastructure';
import { Injectable } from '@nestjs/common';
import { UserInformation } from '../../../../application/dto/user-information';
import { UserRepository } from '../../../../domain/repositories/user.repository';
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
}
