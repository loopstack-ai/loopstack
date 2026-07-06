import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { LoopstackClient } from '@loopstack/client';

const LoopstackContext = createContext<LoopstackClient | undefined>(undefined);

export interface LoopstackProviderProps {
  client: LoopstackClient;
  children?: ReactNode;
}

/**
 * Provides a {@link LoopstackClient} (and its live event stream) to the hook
 * layer. Mount one provider per environment — the client's `envKey` scopes
 * every cache key, so multiple providers can share a single QueryClient
 * without collisions.
 *
 * The host owns the client's lifecycle: create it once (memoized per
 * environment) and call `client.stream.close()` when the environment goes
 * away.
 */
export function LoopstackProvider({ client, children }: LoopstackProviderProps) {
  return <LoopstackContext.Provider value={client}>{children}</LoopstackContext.Provider>;
}

/** The nearest provided client. Throws when used outside a {@link LoopstackProvider}. */
export function useLoopstackClient(): LoopstackClient {
  const client = useContext(LoopstackContext);
  if (!client) {
    throw new Error('useLoopstackClient must be used within a <LoopstackProvider>');
  }
  return client;
}
