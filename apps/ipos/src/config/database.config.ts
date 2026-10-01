import { registerAs } from '@nestjs/config';
import { buildDatabaseConfig } from '@infrastructure';

export const databaseConfig = registerAs('database', () => buildDatabaseConfig());
