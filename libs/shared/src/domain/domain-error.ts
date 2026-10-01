import type { ErrorCategory } from './error-category';

export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly category: ErrorCategory;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
