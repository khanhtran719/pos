import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContextState {
  readonly requestId: string;
  readonly correlationId: string;
  readonly traceId?: string;
  readonly causationId?: string;
  readonly userId?: string;
  readonly storeId?: string;
}

export class RequestContext {
  private static readonly storage = new AsyncLocalStorage<RequestContextState>();

  static run<T>(state: RequestContextState, work: () => T): T {
    return RequestContext.storage.run(Object.freeze({ ...state }), work);
  }

  static current(): RequestContextState | undefined {
    return RequestContext.storage.getStore();
  }
}
