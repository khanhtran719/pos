import { Logger, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { ApiResponseInterceptor, DomainExceptionFilter, RequestContextInterceptor } from '@shared';
import { createGlobalValidationPipe } from '@shared/common/pipes';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('app.port');
  const name = config.getOrThrow<string>('app.name');
  const nodeEnv = config.getOrThrow<string>('app.nodeEnv');

  Logger.overrideLogger(
    nodeEnv === 'production'
      ? ['log', 'error', 'warn']
      : ['log', 'error', 'warn', 'debug', 'verbose'],
  );
  app.flushLogs();

  app.use(cookieParser());
  app.use(compression());
  app.use(helmet());

  app.set('query parser', 'simple');
  app.useBodyParser('json', { limit: '5mb' });
  app.useBodyParser('urlencoded', { extended: false, limit: '5mb', parameterLimit: 100 });

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

  await app.listen(port);

  Logger.log(`listening on ${port}`, name);
}

void bootstrap();
