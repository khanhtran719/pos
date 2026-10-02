export interface AppEnvironment {
  name: string;
  port: number;
  nodeEnv: string;
}

export interface DatabaseEnvironment {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
}

export interface RedisEnvironment {
  host: string;
  port: number;
  password?: string;
}

export interface AuthEnvironment {
  accessTokenSecret: string;
  accessTokenExpiresIn?: string;
  refreshTokenSecret: string;
  refreshTokenExpiresIn?: string;
}

export interface ValidatedEnvironment {
  APP_NAME: string;
  PORT: number;
  NODE_ENV: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  ACCESS_TOKEN_SECRET: string;
  ACCESS_TOKEN_EXPIRES_IN?: string;
  REFRESH_TOKEN_SECRET: string;
  REFRESH_TOKEN_EXPIRES_IN?: string;
}

const REQUIRED_STRINGS = [
  'DB_HOST',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_DATABASE',
  'REDIS_HOST',
  'ACCESS_TOKEN_SECRET',
  'REFRESH_TOKEN_SECRET',
] as const;

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  for (const key of REQUIRED_STRINGS) {
    const value = config[key];

    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`Missing required environment variable ${key}`);
    }
  }

  const port = parsePort(config.PORT, 3000, 'PORT');
  const databasePort = parsePort(config.DB_PORT, 5432, 'DB_PORT');
  const redisPort = parsePort(config.REDIS_PORT, 6379, 'REDIS_PORT');
  const appName = readString(config.APP_NAME, 'central');
  const nodeEnv = readString(config.NODE_ENV, 'development');
  const redisPassword = optionalString(config.REDIS_PASSWORD);
  const accessTokenExpiresIn = optionalString(config.ACCESS_TOKEN_EXPIRES_IN);
  const refreshTokenExpiresIn = optionalString(config.REFRESH_TOKEN_EXPIRES_IN);
  const accessTokenSecret = validateSecret(
    (config.ACCESS_TOKEN_SECRET as string).trim(),
    'ACCESS_TOKEN_SECRET',
  );
  const refreshTokenSecret = validateSecret(
    (config.REFRESH_TOKEN_SECRET as string).trim(),
    'REFRESH_TOKEN_SECRET',
  );

  validateDuration(accessTokenExpiresIn, 'ACCESS_TOKEN_EXPIRES_IN');
  validateDuration(refreshTokenExpiresIn, 'REFRESH_TOKEN_EXPIRES_IN');

  return {
    ...config,
    APP_NAME: appName,
    PORT: port,
    NODE_ENV: nodeEnv,
    DB_HOST: (config.DB_HOST as string).trim(),
    DB_PORT: databasePort,
    DB_USERNAME: (config.DB_USERNAME as string).trim(),
    DB_PASSWORD: config.DB_PASSWORD as string,
    DB_DATABASE: (config.DB_DATABASE as string).trim(),
    REDIS_HOST: (config.REDIS_HOST as string).trim(),
    REDIS_PORT: redisPort,
    REDIS_PASSWORD: redisPassword,
    ACCESS_TOKEN_SECRET: accessTokenSecret,
    ACCESS_TOKEN_EXPIRES_IN: accessTokenExpiresIn,
    REFRESH_TOKEN_SECRET: refreshTokenSecret,
    REFRESH_TOKEN_EXPIRES_IN: refreshTokenExpiresIn,
  };
}

export function buildAppConfig(defaults: { name: string; port: number }): AppEnvironment {
  return {
    name: process.env.APP_NAME?.trim() || defaults.name,
    port: parsePort(process.env.PORT, defaults.port, 'PORT'),
    nodeEnv: process.env.NODE_ENV?.trim() || 'development',
  };
}

export function buildDatabaseConfig(): DatabaseEnvironment {
  return {
    host: requiredProcessEnv('DB_HOST'),
    port: parsePort(process.env.DB_PORT, 5432, 'DB_PORT'),
    username: requiredProcessEnv('DB_USERNAME'),
    password: requiredProcessEnv('DB_PASSWORD'),
    name: requiredProcessEnv('DB_DATABASE'),
  };
}

export function buildRedisConfig(): RedisEnvironment {
  const password = process.env.REDIS_PASSWORD?.trim();

  return {
    host: requiredProcessEnv('REDIS_HOST'),
    port: parsePort(process.env.REDIS_PORT, 6379, 'REDIS_PORT'),
    password: password === '' ? undefined : password,
  };
}

export function buildAuthConfig(): AuthEnvironment {
  const accessTokenExpiresIn = optionalString(process.env.ACCESS_TOKEN_EXPIRES_IN);
  const refreshTokenExpiresIn = optionalString(process.env.REFRESH_TOKEN_EXPIRES_IN);
  const accessTokenSecret = validateSecret(
    requiredProcessEnv('ACCESS_TOKEN_SECRET'),
    'ACCESS_TOKEN_SECRET',
  );
  const refreshTokenSecret = validateSecret(
    requiredProcessEnv('REFRESH_TOKEN_SECRET'),
    'REFRESH_TOKEN_SECRET',
  );

  validateDuration(accessTokenExpiresIn, 'ACCESS_TOKEN_EXPIRES_IN');
  validateDuration(refreshTokenExpiresIn, 'REFRESH_TOKEN_EXPIRES_IN');

  return {
    accessTokenSecret,
    accessTokenExpiresIn: accessTokenExpiresIn || '15m',
    refreshTokenSecret,
    refreshTokenExpiresIn: refreshTokenExpiresIn || '7d',
  };
}

function validateSecret(value: string, name: string): string {
  if (value.length < 32) {
    throw new Error(`${name} must contain at least 32 characters`);
  }

  return value;
}

function validateDuration(value: string | undefined, name: string): void {
  if (value !== undefined && !/^[1-9]\d*(?:ms|s|m|h|d|w|y)$/.test(value)) {
    throw new Error(`${name} must be a positive duration such as 15m or 7d`);
  }
}

function requiredProcessEnv(name: string): string {
  const value = process.env[name];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required environment variable ${name}`);
  }

  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  return value.trim();
}

function readString(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback;
  }

  return value.trim();
}

function parsePort(value: unknown, fallback: number, name: string): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const port = typeof value === 'number' ? value : Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be an integer from 1 to 65535`);
  }

  return port;
}
