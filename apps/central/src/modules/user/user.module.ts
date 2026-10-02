import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserFacade } from './application/facades/user.facade';
import { CREDENTIAL_VERIFIER } from './application/ports/credential-verifier.port';
import { USER_FACADE_PORT } from './application/ports/user-facade.port';
import { USER_REPOSITORY } from './application/ports/user.repository';
import { UserOrmEntity } from './infrastructure/persistence/typeorm/entities/user.orm-entity';
import { TypeOrmUserRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-user.repository';
import { BcryptCredentialVerifierAdapter } from './infrastructure/security/bcrypt-credential-verifier.adapter';

@Module({
  imports: [TypeOrmModule.forFeature([UserOrmEntity])],
  providers: [
    UserFacade,
    TypeOrmUserRepository,
    BcryptCredentialVerifierAdapter,
    { provide: USER_REPOSITORY, useExisting: TypeOrmUserRepository },
    { provide: CREDENTIAL_VERIFIER, useExisting: BcryptCredentialVerifierAdapter },
    { provide: USER_FACADE_PORT, useExisting: UserFacade },
  ],
  exports: [USER_FACADE_PORT],
})
export class UserModule {}
