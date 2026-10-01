import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DomainExceptionFilter, RequestContextInterceptor } from '@shared';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();
  app.useGlobalInterceptors(new RequestContextInterceptor());
  app.useGlobalFilters(new DomainExceptionFilter());

  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('app.port');
  const name = config.getOrThrow<string>('app.name');

  await app.listen(port);
  Logger.log(`listening on ${port}`, name);
}

void bootstrap();
