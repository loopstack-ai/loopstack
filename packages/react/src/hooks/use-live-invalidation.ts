import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { resolveInvalidations } from '@loopstack/client';
import type { QueryKey } from '@loopstack/client';
import { useLoopstackClient } from '../provider.js';

export interface LiveInvalidationOptions {
  /** Coalescing window per cache key, measured from its first event. Default 300 ms. */
  debounceMs?: number;
}

/**
 * Binds the live event stream to the host's QueryClient: every server event
 * stales the cache keys {@link resolveInvalidations} maps it to, coalesced
 * per key so event bursts trigger one refetch. `stream.reset` (lost resume
 * cursor) invalidates the whole environment — every key scoped to this
 * client's `envKey` — and nothing else.
 *
 * Mount once per {@link LoopstackProvider}.
 */
export function useLiveInvalidation(options: LiveInvalidationOptions = {}): void {
  const client = useLoopstackClient();
  const queryClient = useQueryClient();
  const debounceMs = options.debounceMs ?? 300;

  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    const invalidate = (queryKey: QueryKey) => {
      const keyStr = JSON.stringify(queryKey);
      // The window runs from the key's *first* event, and events arriving inside it ride along on
      // the refetch it already scheduled. Restarting the timer instead would let a stream busier
      // than `debounceMs` — an executing run, an agent writing documents — postpone the key for the
      // whole burst, which is what made an answered HITL prompt sit unchanged for seconds.
      if (timers.has(keyStr)) return;
      timers.set(
        keyStr,
        setTimeout(() => {
          timers.delete(keyStr);
          void queryClient.invalidateQueries({ queryKey });
        }, debounceMs),
      );
    };

    const unsubscribe = client.stream.onAny((message) => {
      if (!('userId' in message)) return; // unknown event types carry no invalidation knowledge
      if (message.type === 'stream.reset') {
        void queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[1] === client.envKey,
        });
        return;
      }
      for (const queryKey of resolveInvalidations(message, client.envKey)) {
        invalidate(queryKey);
      }
    });

    return () => {
      unsubscribe();
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, [client, queryClient, debounceMs]);
}
