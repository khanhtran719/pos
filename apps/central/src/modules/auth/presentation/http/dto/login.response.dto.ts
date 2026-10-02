import { CurrentUserResponseDto } from './current-user.response.dto';
import { TokenResponseDto } from './token.response.dto';

export class LoginResponseDto extends TokenResponseDto {
  readonly user!: CurrentUserResponseDto;
}
