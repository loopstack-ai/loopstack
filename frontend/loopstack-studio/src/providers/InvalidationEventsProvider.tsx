import { QueryClient, useQueryClient } from '@tanstack/react-query';
import debounce from 'lodash/debounce';
import { useEffect, useRef } from 'react';
import { SseClientEvents } from '@/events';
import { getDocumentsCacheKey } from '@/hooks/useDocuments.ts';
import { getNamespacesByPipelineCacheKey } from '@/hooks/useNamespaces.ts';
import { getWorkflowCacheKey, getWorkflowsByPipelineCacheKey, getWorkflowsCacheKey } from '@/hooks/useWorkflows.ts';
import { eventBus } from '@/services';
import { useStudio } from './StudioProvider';

type DebouncedInvalidator = ReturnType<typeof debounce<() => void>>;

interface WorkflowEventPayload {
  id?: string;
  namespaceId?: string;
  pipelineId?: string;
}

interface DocumentEventPayload {
  workflowId?: string;
}

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

    const unsubWorkflowCreated = eventBus.on(SseClientEvents.WORKFLOW_CREATED, (payload: WorkflowEventPayload) => {
      if (payload.namespaceId) {
        invalidate(getWorkflowsCacheKey(envKey, payload.namespaceId));
      }
      if (payload.pipelineId) {
        invalidate(getNamespacesByPipelineCacheKey(envKey, payload.pipelineId));
        invalidate(getWorkflowsByPipelineCacheKey(envKey, payload.pipelineId));
      }
    });

    const unsubWorkflowUpdated = eventBus.on(SseClientEvents.WORKFLOW_UPDATED, (payload: WorkflowEventPayload) => {
      if (payload.id) {
        invalidate(getWorkflowCacheKey(envKey, payload.id));
      }
      if (payload.namespaceId) {
        invalidate(getWorkflowsCacheKey(envKey, payload.namespaceId));
      }
      if (payload.pipelineId) {
        invalidate(getNamespacesByPipelineCacheKey(envKey, payload.pipelineId));
        invalidate(getWorkflowsByPipelineCacheKey(envKey, payload.pipelineId));
      }
    });

    const unsubDocumentCreated = eventBus.on(SseClientEvents.DOCUMENT_CREATED, (payload: DocumentEventPayload) => {
      if (payload.workflowId) {
        invalidate(getDocumentsCacheKey(envKey, payload.workflowId));
      }
    });

    return () => {
      unsubWorkflowCreated();
      unsubWorkflowUpdated();
      unsubDocumentCreated();

      // Cancel all pending debounced calls and clear cache
      cache.forEach((debouncedFn) => debouncedFn.cancel());
      cache.clear();
    };
  }, [queryClient, environment.id]);

  return null;
}
