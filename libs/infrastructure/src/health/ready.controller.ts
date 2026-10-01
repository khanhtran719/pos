import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { DataSource } from 'typeorm';

@Controller()
export class ReadyController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('ready')
  async ready(@Res({ passthrough: true }) response: Response): Promise<{ status: 'ok' | 'error' }> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
      return { status: 'error' };
    }

    return { status: 'ok' };
  }
}
