import { Module } from '@nestjs/common';

import { LiveController } from './live.controller';
import { ReadyController } from './ready.controller';

@Module({
  controllers: [LiveController, ReadyController],
})
export class HealthModule {}
