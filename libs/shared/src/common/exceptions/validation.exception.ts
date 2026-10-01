import { DomainError } from '../../domain/domain-error';
import { ErrorCategory } from '../../domain/error-category';

export class ValidationException extends DomainError {
  readonly code = 'VALIDATION';
  readonly category = ErrorCategory.BadInput;

  constructor(message: string) {
    super(message);
  }
}
