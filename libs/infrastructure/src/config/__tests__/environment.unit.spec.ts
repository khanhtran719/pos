import { validateEnvironment } from '../environment';

describe('validateEnvironment', () => {
  const complete = {
    DB_HOST: 'localhost',
    DB_USERNAME: 'pos',
    DB_PASSWORD: 'pos',
    DB_DATABASE: 'central',
    REDIS_HOST: 'localhost',
  };

  it('fills default port and app name', () => {
    const env = validateEnvironment(complete);

    expect(env.APP_NAME).toBe('central');
    expect(env.PORT).toBe(3000);
    expect(env.DB_PORT).toBe(5432);
    expect(env.REDIS_PORT).toBe(6379);
    expect(env.NODE_ENV).toBe('development');
  });

  it('rejects a missing database name', () => {
    expect(() =>
      validateEnvironment({
        ...complete,
        DB_DATABASE: ' ',
      }),
    ).toThrow('Missing required environment variable DB_DATABASE');
  });

  it('rejects a port outside the valid range', () => {
    expect(() =>
      validateEnvironment({
        ...complete,
        PORT: '70000',
      }),
    ).toThrow('PORT must be an integer from 1 to 65535');
  });
});
