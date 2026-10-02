import { Injectable } from '@nestjs/common';

import type { Clock } from '../../application/ports/clock.port';

@Injectable()
export class SystemClockAdapter implements Clock {
  now(): Date {
    return new Date();
  }
}
