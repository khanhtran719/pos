import { ConfigService } from '@nestjs/config';

import { RedisKeyFactory } from '../redis-key.factory';

describe('RedisKeyFactory', () => {
  function factory(appName: string): RedisKeyFactory {
    return new RedisKeyFactory({
      getOrThrow: () => appName,
    } as unknown as ConfigService);
  }

  it('builds a namespaced key for the current app', () => {
    expect(factory('ipos').key('invoice', 'detail', 'inv-1')).toBe('ipos:invoice:detail:inv-1');
  });

  it('rejects a segment that contains a colon', () => {
    expect(() => factory('central').key('invoice', 'detail', 'a:b')).toThrow(
      'Redis key segments must be non-empty and must not contain ":"',
    );
  });
});
