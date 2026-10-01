/**
 * Transport-neutral failure semantics. Delivery adapters map these categories
 * to their own status/protocol without leaking HTTP concepts into the domain.
 */
export enum ErrorCategory {
  BadInput = 'bad_input',
  Unauthorized = 'unauthorized',
  Forbidden = 'forbidden',
  NotFound = 'not_found',
  Conflict = 'conflict',
  BusinessRule = 'business_rule',
  RateLimited = 'rate_limited',
}
