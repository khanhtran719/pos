import { RequestContext } from '../request-context';

describe('RequestContext', () => {
  it('keeps correlation metadata inside the current async flow', async () => {
    await RequestContext.run({ requestId: 'req-1', correlationId: 'corr-1' }, async () => {
      await Promise.resolve();

      expect(RequestContext.current()).toEqual({
        requestId: 'req-1',
        correlationId: 'corr-1',
      });
    });

    expect(RequestContext.current()).toBeUndefined();
  });
});
