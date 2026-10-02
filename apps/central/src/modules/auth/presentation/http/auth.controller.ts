import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';

import { GetCurrentUserUseCase } from '../../application/use-cases/get-current-user.use-case';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { RefreshSessionUseCase } from '../../application/use-cases/refresh-session.use-case';
import { CurrentPrincipal } from './decorators/current-principal.decorator';
import { LoginRequestDto } from './dto/login.request.dto';
import { RefreshSessionRequestDto } from './dto/refresh-session.request.dto';
import type { CurrentUserResponseDto } from './dto/current-user.response.dto';
import type { LoginResponseDto } from './dto/login.response.dto';
import type { TokenResponseDto } from './dto/token.response.dto';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AuthResponseMapper } from './mappers/auth.response-mapper';
import type { AuthPrincipal } from '../../application/ports/auth-token.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
    private readonly logout: LogoutUseCase,
    private readonly getCurrentUser: GetCurrentUserUseCase,
  ) {}

  @Post('login')
  @HttpCode(200)
  async loginSession(@Body() request: LoginRequestDto): Promise<LoginResponseDto> {
    const result = await this.login.execute({ sale: request.sale, pin: request.pin });

    return AuthResponseMapper.toLogin(result);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() request: RefreshSessionRequestDto): Promise<TokenResponseDto> {
    const result = await this.refreshSession.execute(request.refreshToken);

    return AuthResponseMapper.toToken(result);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AccessTokenGuard)
  async logoutSession(@CurrentPrincipal() principal: AuthPrincipal): Promise<void> {
    await this.logout.execute(principal);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  async me(@CurrentPrincipal() principal: AuthPrincipal): Promise<CurrentUserResponseDto> {
    const user = await this.getCurrentUser.execute(principal.userId);

    return AuthResponseMapper.toUser(user);
  }
}
