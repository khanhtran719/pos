import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { configureHttpApplication } from '@infrastructure';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('app.port');
  const name = config.getOrThrow<string>('app.name');
  const nodeEnv = config.getOrThrow<string>('app.nodeEnv');

  configureHttpApplication(app, { nodeEnv });

  await app.listen(port);

  Logger.log(`listening on ${port}`, name);
}

void bootstrap();
