import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useStudio } from './StudioProvider';
import { eventBus } from '@/services';
import { SseClientEvents } from '@/events';
import { getDocumentsCacheKey } from '@/hooks/useDocuments.ts';
import { getWorkflowCacheKey, getWorkflowsByPipelineCacheKey, getWorkflowsCacheKey } from '@/hooks/useWorkflows.ts';
import { getNamespacesByPipelineCacheKey } from '@/hooks/useNamespaces.ts';

export function InvalidationEventsProvider() {
  const { environment } = useStudio();
  const queryClient = useQueryClient();
  const workflowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const documentTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!environment.id) return;

    console.log('InvalidationEventsProvider mounted for environment:', environment.id);

    const envKey = environment.id;
    const unsubWorkflowCreatedSubscriber = eventBus.on(
      SseClientEvents.WORKFLOW_CREATED,
      (payload: any) => {
        if (workflowTimeoutRef.current) {
          clearTimeout(workflowTimeoutRef.current);
        }
        workflowTimeoutRef.current = setTimeout(() => {
          if (payload.namespaceId) {
            queryClient.invalidateQueries({
              queryKey: getWorkflowsCacheKey(envKey, payload.namespaceId)
            });
          }

          if (payload.pipelineId) {
            queryClient.invalidateQueries({
              queryKey: getNamespacesByPipelineCacheKey(envKey, payload.pipelineId)
            });
            queryClient.invalidateQueries({
              queryKey: getWorkflowsByPipelineCacheKey(envKey, payload.pipelineId)
            });
          }
        }, 300);
      }
    );
    
    const unsubWorkflowUpdatedSubscriber = eventBus.on(
      SseClientEvents.WORKFLOW_UPDATED,
      (payload: any) => {
        if (workflowTimeoutRef.current) {
          clearTimeout(workflowTimeoutRef.current);
        }
        workflowTimeoutRef.current = setTimeout(() => {
          if (payload.id) {
            queryClient.invalidateQueries({ queryKey: getWorkflowCacheKey(envKey, payload.id) });
          }

          if (payload.namespaceId)  {
            queryClient.invalidateQueries({
              queryKey: getWorkflowsCacheKey(envKey, payload.namespaceId)
            });
          }

          if (payload.pipelineId) {
            queryClient.invalidateQueries({
              queryKey: getNamespacesByPipelineCacheKey(envKey, payload.pipelineId)
            });
            queryClient.invalidateQueries({
              queryKey: getWorkflowsByPipelineCacheKey(envKey, payload.pipelineId)
            });
          }
        }, 300);
      }
    );

    const unsubDocumentCreatedSubscriber = eventBus.on(
      SseClientEvents.DOCUMENT_CREATED,
      (payload: any) => {
        if (documentTimeoutRef.current) {
          clearTimeout(documentTimeoutRef.current);
        }
        documentTimeoutRef.current = setTimeout(() => {
          if (payload.workflowId) {
            queryClient.invalidateQueries({ queryKey: getDocumentsCacheKey(envKey, payload.workflowId)});
          }
        }, 300);
      }
    );

    return () => {
      unsubWorkflowCreatedSubscriber();
      unsubWorkflowUpdatedSubscriber();
      unsubDocumentCreatedSubscriber();
      if (workflowTimeoutRef.current) {
        clearTimeout(workflowTimeoutRef.current);
      }
      if (documentTimeoutRef.current) {
        clearTimeout(documentTimeoutRef.current);
      }
    };
  }, [queryClient, environment.id]);

  return null;
}
