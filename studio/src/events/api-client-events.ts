export const ApiClientEvents = {
  UNAUTHORIZED: 'api.unauthorized',
  ERR_NETWORK: 'api.ERR_NETWORK',
  /** A request has been waiting far longer than any request should, without failing. */
  REQUEST_STALLED: 'api.requestStalled',
  /** Every stalled request has since settled. */
  REQUEST_RECOVERED: 'api.requestRecovered',
} as const;

export type ApiClientEvents = (typeof ApiClientEvents)[keyof typeof ApiClientEvents];

type ApiClientEventListener = (environmentId: string) => void;

function createApiClientEventEmitter() {
  const listeners = new Map<ApiClientEvents, Set<ApiClientEventListener>>();

  return {
    on(event: ApiClientEvents, listener: ApiClientEventListener): () => void {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener);
      return () => listeners.get(event)?.delete(listener);
    },
    emit(event: ApiClientEvents, environmentId: string): void {
      for (const listener of listeners.get(event) ?? []) listener(environmentId);
    },
  };
}

/**
 * Narrow channel for API transport trouble (unauthorized, network down, requests that hang) feeding the
 * health-check escalation flow. The Loopstack SDK's reporting fetch wrapper emits here.
 */
export const apiClientEvents = createApiClientEventEmitter();
