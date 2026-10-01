import { DomainError } from '../../domain/domain-error';

export class ValidationException extends DomainError {
  readonly code = 'VALIDATION';

  constructor(message: string) {
    super(message);
  }
}
