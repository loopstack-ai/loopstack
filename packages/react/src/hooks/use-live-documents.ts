import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { type DocumentScope, type DocumentWindow, fetchDocumentsSince, queryKeys } from '@loopstack/client';
import type { DocumentItemInterface } from '@loopstack/contracts/api';
import { useLoopstackClient } from '../provider.js';

export interface LiveDocumentsOptions {
  /** Coalescing window per workflow, measured from its first event. Default 300 ms. */
  debounceMs?: number;
}

/** Both document scopes a cached window can have — a `document.created` event updates either. */
const SCOPES: DocumentScope[] = ['current', 'all'];

/**
 * Merge freshly fetched documents into a window: a document already present is replaced (a re-saved
 * progress line or a finished stream), a new one is appended. Display order (`index`) is restored after.
 */
export function mergeDocuments(window: DocumentWindow, incoming: DocumentItemInterface[]): DocumentWindow {
  if (incoming.length === 0) return window;
  const byId = new Map(window.documents.map((item) => [item.id, item]));
  let added = 0;
  for (const item of incoming) {
    if (!byId.has(item.id)) added++;
    byId.set(item.id, item);
  }
  return {
    documents: [...byId.values()].sort((a, b) => a.index - b.index),
    total: window.total + added,
  };
}

/**
 * Keeps cached document windows current from the live event stream.
 *
 * A run's document list grows without bound, so a `document.created` event does **not** invalidate it —
 * refetching the list on every message is what made long runs stop updating. Instead this fetches only the
 * documents written since the window's newest row (`updatedAfter`) and merges them in by id, which covers
 * new documents and re-saved ones alike. Workflows with no cached window are ignored: nothing is displaying
 * them, and the window query fetches the live end when one opens.
 *
 * Mount once per {@link LoopstackProvider}, alongside {@link useLiveInvalidation}.
 */
export function useLiveDocuments(options: LiveDocumentsOptions = {}): void {
  const client = useLoopstackClient();
  const queryClient = useQueryClient();
  const debounceMs = options.debounceMs ?? 300;

  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    const syncWindow = async (workflowId: string, scope: DocumentScope) => {
      const queryKey = queryKeys.documents(client.envKey, workflowId, scope);
      const cached = queryClient.getQueryData<DocumentWindow>(queryKey);
      if (!cached) return;

      const newest = cached.documents.reduce<string | undefined>(
        (latest, item) => (!latest || item.updatedAt > latest ? item.updatedAt : latest),
        undefined,
      );
      // An empty window has no timestamp to ask from — refetch it rather than pulling the whole run.
      if (!newest) {
        await queryClient.invalidateQueries({ queryKey });
        return;
      }

      const page = await fetchDocumentsSince(client.documents, workflowId, newest, scope);
      if (page.data.length === 0) return;
      queryClient.setQueryData<DocumentWindow>(queryKey, (current) =>
        current ? mergeDocuments(current, page.data) : current,
      );
    };

    const schedule = (workflowId: string) => {
      // Coalesce from the run's first event, not its last: a run writing documents faster than
      // `debounceMs` must still get its window synced while it is busy, not only once it falls quiet.
      if (timers.has(workflowId)) return;
      timers.set(
        workflowId,
        setTimeout(() => {
          timers.delete(workflowId);
          for (const scope of SCOPES) void syncWindow(workflowId, scope);
        }, debounceMs),
      );
    };

    const unsubscribe = client.stream.onAny((message) => {
      // Unknown event types carry no workflow scope — only the typed document event is actionable.
      if (message.type === 'document.created' && 'workflowId' in message) schedule(message.workflowId);
    });

    return () => {
      unsubscribe();
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, [client, queryClient, debounceMs]);
}
