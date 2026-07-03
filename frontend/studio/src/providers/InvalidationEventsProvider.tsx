import { QueryClient, useQueryClient } from '@tanstack/react-query';
import debounce from 'lodash/debounce';
import { useEffect, useRef } from 'react';
import type {
  DocumentCreatedEvent,
  SecretDeletedEvent,
  SecretUpsertedEvent,
  WorkflowCreatedEvent,
  WorkflowUpdatedEvent,
} from '@loopstack/contracts/events';
import {
  getChildWorkflowsCacheKey,
  getDocumentsCacheKey,
  getSecretsCacheKey,
  getWorkflowCacheKey,
  getWorkflowStatusCacheKey,
} from '@/hooks/query-keys';
import { eventBus } from '@/services';
import { useStudio } from './StudioProvider';

type DebouncedInvalidator = ReturnType<typeof debounce<() => void>>;

const DEBOUNCE_MS = 300;

function createDebouncedInvalidator(queryClient: QueryClient, queryKey: unknown[]): DebouncedInvalidator {
  return debounce(() => {
    void queryClient.invalidateQueries({ queryKey });
  }, DEBOUNCE_MS);
}

export function InvalidationEventsProvider() {
  const { environment } = useStudio();
  const queryClient = useQueryClient();
  const invalidatorCache = useRef<Map<string, DebouncedInvalidator>>(new Map());

  useEffect(() => {
    if (!environment.id) return;

    const envKey = environment.id;
    const cache = invalidatorCache.current;

    function invalidate(queryKey: unknown[]) {
      const keyStr = JSON.stringify(queryKey);

      if (!cache.has(keyStr)) {
        cache.set(keyStr, createDebouncedInvalidator(queryClient, queryKey));
      }

      cache.get(keyStr)!();
    }

    const unsubWorkflowCreated = eventBus.on('workflow.created', (payload: WorkflowCreatedEvent) => {
      if (payload.parentId) {
        invalidate(getChildWorkflowsCacheKey(envKey, payload.parentId));
      }
    });

    const unsubWorkflowUpdated = eventBus.on('workflow.updated', (payload: WorkflowUpdatedEvent) => {
      invalidate(getWorkflowCacheKey(envKey, payload.id));
      invalidate(getWorkflowStatusCacheKey(envKey, payload.id));
      if (payload.parentId) {
        invalidate(getChildWorkflowsCacheKey(envKey, payload.parentId));
      }
    });

    const unsubDocumentCreated = eventBus.on('document.created', (payload: DocumentCreatedEvent) => {
      invalidate(getDocumentsCacheKey(envKey, payload.workflowId));
    });

    const invalidateSecrets = (payload: SecretUpsertedEvent | SecretDeletedEvent) => {
      invalidate(getSecretsCacheKey(envKey, payload.workspaceId));
    };
    const unsubSecretUpserted = eventBus.on('secret.upserted', invalidateSecrets);
    const unsubSecretDeleted = eventBus.on('secret.deleted', invalidateSecrets);

    return () => {
      unsubWorkflowCreated();
      unsubWorkflowUpdated();
      unsubDocumentCreated();
      unsubSecretUpserted();
      unsubSecretDeleted();

      // Cancel all pending debounced calls and clear cache
      cache.forEach((debouncedFn) => debouncedFn.cancel());
      cache.clear();
    };
  }, [queryClient, environment.id]);

  return null;
}
