import { Logger, RequestMethod } from '@nestjs/common';
import { vi } from 'vitest';

import { configureHttpApplication } from '../configure-http-application';

describe('configureHttpApplication', () => {
  it('applies the shared production HTTP policy', () => {
    const app = {
      enableShutdownHooks: vi.fn(),
      flushLogs: vi.fn(),
      set: vi.fn(),
      setGlobalPrefix: vi.fn(),
      use: vi.fn(),
      useBodyParser: vi.fn(),
      useGlobalFilters: vi.fn(),
      useGlobalInterceptors: vi.fn(),
      useGlobalPipes: vi.fn(),
    };
    const overrideLogger = vi.spyOn(Logger, 'overrideLogger').mockImplementation(() => undefined);

    configureHttpApplication(app as never, { nodeEnv: 'production' });

    expect(app.enableShutdownHooks).toHaveBeenCalledOnce();
    expect(overrideLogger).toHaveBeenCalledWith(['log', 'error', 'warn']);
    expect(app.flushLogs).toHaveBeenCalledOnce();
    expect(app.use).toHaveBeenCalledTimes(3);
    expect(app.set).toHaveBeenCalledWith('query parser', 'simple');
    expect(app.useBodyParser).toHaveBeenCalledWith('json', { limit: '5mb' });
    expect(app.useBodyParser).toHaveBeenCalledWith('urlencoded', {
      extended: false,
      limit: '5mb',
      parameterLimit: 100,
    });
    expect(app.useGlobalPipes).toHaveBeenCalledOnce();
    expect(app.useGlobalInterceptors).toHaveBeenCalledOnce();
    expect(app.useGlobalFilters).toHaveBeenCalledOnce();
    expect(app.setGlobalPrefix).toHaveBeenCalledWith('api', {
      exclude: [
        { path: 'live', method: RequestMethod.GET },
        { path: 'ready', method: RequestMethod.GET },
        { path: 'metrics', method: RequestMethod.GET },
      ],
    });

    overrideLogger.mockRestore();
  });

  it('keeps verbose logger levels outside production', () => {
    const app = {
      enableShutdownHooks: vi.fn(),
      flushLogs: vi.fn(),
      set: vi.fn(),
      setGlobalPrefix: vi.fn(),
      use: vi.fn(),
      useBodyParser: vi.fn(),
      useGlobalFilters: vi.fn(),
      useGlobalInterceptors: vi.fn(),
      useGlobalPipes: vi.fn(),
    };
    const overrideLogger = vi.spyOn(Logger, 'overrideLogger').mockImplementation(() => undefined);

    configureHttpApplication(app as never, { nodeEnv: 'development' });

    expect(overrideLogger).toHaveBeenCalledWith([
      'log',
      'error',
      'warn',
      'debug',
      'verbose',
    ]);

    overrideLogger.mockRestore();
  });
});
