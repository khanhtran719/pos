import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContextState {
  requestId: string;
  correlationId: string;
}

export class RequestContext {
  private static readonly storage = new AsyncLocalStorage<RequestContextState>();

  static run<T>(state: RequestContextState, work: () => T): T {
    return this.storage.run(state, work);
  }

  static current(): RequestContextState | undefined {
    return this.storage.getStore();
  }
}
