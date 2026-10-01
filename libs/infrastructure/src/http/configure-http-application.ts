import { type LogLevel, Logger, RequestMethod } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { ApiResponseInterceptor, DomainExceptionFilter, RequestContextInterceptor } from '@shared';
import { createGlobalValidationPipe } from '@shared';

export interface HttpApplicationOptions {
  nodeEnv: string;
}

const PRODUCTION_LOG_LEVELS: LogLevel[] = ['log', 'error', 'warn'];
const DEVELOPMENT_LOG_LEVELS: LogLevel[] = [
  'log',
  'error',
  'warn',
  'debug',
  'verbose',
];

export function configureHttpApplication(
  app: NestExpressApplication,
  options: HttpApplicationOptions,
): void {
  app.enableShutdownHooks();

  Logger.overrideLogger(
    options.nodeEnv === 'production' ? PRODUCTION_LOG_LEVELS : DEVELOPMENT_LOG_LEVELS,
  );
  app.flushLogs();

  app.use(cookieParser());
  app.use(compression());
  app.use(helmet());

  app.set('query parser', 'simple');
  app.useBodyParser('json', { limit: '5mb' });
  app.useBodyParser('urlencoded', {
    extended: false,
    limit: '5mb',
    parameterLimit: 100,
  });

  app.useGlobalPipes(createGlobalValidationPipe());
  app.useGlobalInterceptors(new RequestContextInterceptor(), new ApiResponseInterceptor());
  app.useGlobalFilters(new DomainExceptionFilter());

  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'live', method: RequestMethod.GET },
      { path: 'ready', method: RequestMethod.GET },
      { path: 'metrics', method: RequestMethod.GET },
    ],
  });
}
