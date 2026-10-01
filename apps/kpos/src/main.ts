import { Logger, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { ApiResponseInterceptor, DomainExceptionFilter, RequestContextInterceptor } from '@shared';
import { createGlobalValidationPipe } from '@shared/common/pipes';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.enableShutdownHooks();
  app.useGlobalPipes(createGlobalValidationPipe());
  app.useGlobalInterceptors(new RequestContextInterceptor(), new ApiResponseInterceptor());
  app.useGlobalFilters(new DomainExceptionFilter());
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'live', method: RequestMethod.GET },
      { path: 'ready', method: RequestMethod.GET },
    ],
  });

  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('app.port');
  const name = config.getOrThrow<string>('app.name');

  await app.listen(port);
  Logger.log(`listening on ${port}`, name);
}

void bootstrap();
