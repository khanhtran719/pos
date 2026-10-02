import { DomainError, ErrorCategory } from '@shared';

export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS';
  readonly category = ErrorCategory.Unauthorized;

  constructor() {
    super('Thông tin đăng nhập không hợp lệ.');
  }
}
