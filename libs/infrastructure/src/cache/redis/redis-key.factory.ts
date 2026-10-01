import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisKeyFactory {
  constructor(private readonly config: ConfigService) {}

  key(module: string, purpose: string, identifier: string): string {
    const system = this.config.getOrThrow<string>('app.name');
    const segments = [system, module, purpose, identifier];

    for (const segment of segments) {
      if (segment.trim() === '' || segment.includes(':')) {
        throw new Error(
          'Redis key segments must be non-empty and must not contain ":"',
        );
      }
    }

    return segments.join(':');
  }
}
