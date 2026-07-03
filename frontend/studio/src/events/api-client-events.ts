export const ApiClientEvents = {
  UNAUTHORIZED: 'api.unauthorized',
  ERR_NETWORK: 'api.ERR_NETWORK',
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
 * Narrow channel for API transport errors (unauthorized, network down) feeding
 * the health-check escalation flow. The Loopstack SDK's reporting fetch
 * wrapper emits here.
 */
export const apiClientEvents = createApiClientEventEmitter();
