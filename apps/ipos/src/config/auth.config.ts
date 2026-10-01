import { registerAs } from '@nestjs/config';

import { buildAuthConfig } from '@infrastructure';

export const authConfig = registerAs('auth', () => buildAuthConfig());
