import type { UserInformation } from '../../../../user/application/ports/user-facade.port';
import type { LoginResult, TokenResult } from '../../../application/dto/auth-result';
import type { CurrentUserResponseDto } from '../dto/current-user.response.dto';
import type { LoginResponseDto } from '../dto/login.response.dto';
import type { TokenResponseDto } from '../dto/token.response.dto';

export class AuthResponseMapper {
  static toLogin(result: LoginResult): LoginResponseDto {
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      tokenType: result.tokenType,
      expiresIn: result.expiresIn,
      user: AuthResponseMapper.toUser(result.user),
    };
  }

  static toToken(result: TokenResult): TokenResponseDto {
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      tokenType: result.tokenType,
      expiresIn: result.expiresIn,
    };
  }

  static toUser(user: UserInformation): CurrentUserResponseDto {
    return {
      id: user.id,
      code: user.code,
      sale: user.sale,
      name: user.name,
      status: user.status,
    };
  }
}
