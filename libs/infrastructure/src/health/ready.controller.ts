import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller()
export class ReadyController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('ready')
  async ready(): Promise<{ status: 'ok' }> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('database unavailable');
    }

    return { status: 'ok' };
  }
}
