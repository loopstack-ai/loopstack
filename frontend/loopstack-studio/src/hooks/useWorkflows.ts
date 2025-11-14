import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useApiClient } from './useApi.ts';
import type { WorkflowItemDto, WorkflowSortByDto } from '@loopstack/api-client';
import { eventBus } from '../services';
import { SseClientEvents } from '../events';

export function useWorkflow(id: string) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: ['workflow', id, envKey],
    queryFn: () => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1WorkflowsApi.workflowControllerGetWorkflowById({ id });
    },
    enabled: !!id,
    select: (res) => res.data
  });
}

export function useFetchWorkflowsByPipeline(pipelineId: string) {
  const { envKey, api } = useApiClient();

  const requestParams = {
    filter: JSON.stringify({
      pipelineId
    }),
    sortBy: JSON.stringify([
      {
        field: 'index',
        order: 'ASC'
      } as WorkflowSortByDto
    ])
  };

  return useQuery({
    queryKey: ['workflows-by-pipeline', pipelineId, envKey],
    queryFn: () => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1WorkflowsApi.workflowControllerGetWorkflows(requestParams);
    },
    select: (res) => res.data.data,
    enabled: true
  });
}

export function useFetchWorkflowsByNamespace(namespaceId: string) {
  const { envKey, api } = useApiClient();

  const requestParams = {
    filter: JSON.stringify({
      namespaceId
    }),
    sortBy: JSON.stringify([
      {
        field: 'index',
        order: 'ASC'
      } as WorkflowSortByDto
    ])
  };

  return useQuery({
    queryKey: ['workflows', namespaceId, envKey],
    queryFn: () => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1WorkflowsApi.workflowControllerGetWorkflows(requestParams);
    },
    select: (res) => res.data.data,
    enabled: true
  });
}

export function useDeleteWorkflow() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workflow: WorkflowItemDto) => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1WorkflowsApi.workflowControllerDeleteWorkflow({ id: workflow.id });
    },
    onSuccess: (_, workflow) => {
      queryClient.removeQueries({ queryKey: ['workflow', workflow.id, envKey] });
      queryClient.invalidateQueries({ queryKey: ['workflows', workflow.namespaceId, envKey] });
      queryClient.invalidateQueries({
        queryKey: ['workflows-by-pipeline', workflow.pipelineId, envKey]
      });
    }
  });
}

export function useWorkflowsInvalidationEvents(workerId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (workerId) {
      const unsubWorkflowCreatedSubscriber = eventBus.on(
        SseClientEvents.WORKFLOW_CREATED,
        (payload: any) => {
          if (payload.namespaceId) {
            queryClient.invalidateQueries({
              queryKey: ['workflows', payload.namespaceId, workerId]
            });
            queryClient.invalidateQueries({
              queryKey: ['namespaces', payload.pipelineId, workerId]
            });
            queryClient.invalidateQueries({
              queryKey: ['workflows', payload.namespaceId, workerId]
            });
          }

          if (payload.pipelineId) {
            queryClient.invalidateQueries({
              queryKey: ['workflows-by-pipeline', payload.pipelineId, workerId]
            });
          }
        }
      );

      const unsubWorkflowUpdatedSubscriber = eventBus.on(
        SseClientEvents.WORKFLOW_UPDATED,
        (payload: any) => {
          if (payload.id) {
            queryClient.invalidateQueries({ queryKey: ['workflow', payload.id, workerId] });
            queryClient.invalidateQueries({
              queryKey: ['namespaces', payload.pipelineId, workerId]
            });
            queryClient.invalidateQueries({
              queryKey: ['workflows', payload.namespaceId, workerId]
            });
          }
        }
      );

      return () => {
        unsubWorkflowCreatedSubscriber();
        unsubWorkflowUpdatedSubscriber();
      };
    }
  }, [queryClient]);
}
