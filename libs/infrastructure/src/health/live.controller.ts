import { Controller, Get } from '@nestjs/common';

@Controller()
export class LiveController {
  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
