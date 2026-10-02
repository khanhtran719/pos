import { DomainError, ErrorCategory } from '@shared';

export class InvalidSessionError extends DomainError {
  readonly code = 'INVALID_SESSION';
  readonly category = ErrorCategory.Unauthorized;

  constructor() {
    super('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
  }
}
