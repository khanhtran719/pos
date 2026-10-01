import { registerAs } from '@nestjs/config';

import { buildAppConfig } from '@infrastructure';

export const appConfig = registerAs('app', () => buildAppConfig({ name: 'ipos', port: 3001 }));
