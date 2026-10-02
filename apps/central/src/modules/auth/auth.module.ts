import type { AuthEnvironment } from '@infrastructure';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from '../user/user.module';
import { AUTH_TOKEN_SERVICE } from './application/ports/auth-token.service';
import { CLOCK } from './application/ports/clock.port';
import { ID_GENERATOR } from './application/ports/id-generator';
import { SESSION_REPOSITORY } from './application/ports/session.repository';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { RefreshSessionUseCase } from './application/use-cases/refresh-session.use-case';
import { ValidateAccessSessionUseCase } from './application/use-cases/validate-access-session.use-case';
import { SessionOrmEntity } from './infrastructure/persistence/typeorm/entities/session.orm-entity';
import { TypeOrmSessionRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-session.repository';
import {
  JwtAuthTokenService,
  type JwtAuthOptions,
} from './infrastructure/security/jwt-auth-token.service';
import { UuidGenerator } from './infrastructure/security/uuid-generator';
import { SystemClockAdapter } from './infrastructure/time/system-clock.adapter';
import { AuthController } from './presentation/http/auth.controller';
import { AccessTokenGuard } from './presentation/http/guards/access-token.guard';

@Module({
  imports: [JwtModule.register({}), TypeOrmModule.forFeature([SessionOrmEntity]), UserModule],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    GetCurrentUserUseCase,
    ValidateAccessSessionUseCase,
    AccessTokenGuard,
    TypeOrmSessionRepository,
    UuidGenerator,
    SystemClockAdapter,
    { provide: SESSION_REPOSITORY, useExisting: TypeOrmSessionRepository },
    { provide: CLOCK, useExisting: SystemClockAdapter },
    { provide: ID_GENERATOR, useExisting: UuidGenerator },
    {
      provide: AUTH_TOKEN_SERVICE,
      inject: [JwtService, ConfigService],
      useFactory: (jwt: JwtService, config: ConfigService) => {
        const auth = config.getOrThrow<AuthEnvironment>('auth');
        const options: JwtAuthOptions = {
          accessTokenSecret: auth.accessTokenSecret,
          accessTokenExpiresIn: auth.accessTokenExpiresIn ?? '15m',
          refreshTokenSecret: auth.refreshTokenSecret,
          refreshTokenExpiresIn: auth.refreshTokenExpiresIn ?? '7d',
        };

        return new JwtAuthTokenService(jwt, options);
      },
    },
  ],
})
export class AuthModule {}
