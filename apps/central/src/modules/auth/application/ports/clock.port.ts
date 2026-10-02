export const CLOCK = Symbol('AUTH_CLOCK');

export interface Clock {
  now(): Date;
}
