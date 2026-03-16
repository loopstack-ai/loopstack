import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { WorkflowItemInterface, WorkflowSortByInterface } from '@loopstack/contracts/api';
import type { WorkflowInterface } from '@loopstack/contracts/types';
import {
  getAllWorkflowsCacheKey,
  getWorkflowCacheKey,
  getWorkflowsByPipelineCacheKey,
  getWorkflowsCacheKey,
} from './query-keys.ts';
import { useApiClient } from './useApi.ts';

export function useWorkflow(id: string) {
  const { envKey, api } = useApiClient();

  return useQuery<WorkflowInterface>({
    queryKey: getWorkflowCacheKey(envKey, id),
    queryFn: () => api.workflows.getById({ id }),
    enabled: !!id,
  });
}

export function useFetchWorkflowsByPipeline(pipelineId: string) {
  const { envKey, api } = useApiClient();

  const requestParams = {
    filter: JSON.stringify({
      pipelineId,
    }),
    sortBy: JSON.stringify([
      {
        field: 'index',
        order: 'ASC',
      } as WorkflowSortByInterface,
    ]),
  };

  return useQuery({
    queryKey: getWorkflowsByPipelineCacheKey(envKey, pipelineId),
    queryFn: () => api.workflows.getAll(requestParams),
    select: (res) => res.data,
  });
}

export function useFetchWorkflowsByNamespace(namespaceId: string) {
  const { envKey, api } = useApiClient();

  const requestParams = {
    filter: JSON.stringify({
      namespaceId,
    }),
    sortBy: JSON.stringify([
      {
        field: 'index',
        order: 'ASC',
      } as WorkflowSortByInterface,
    ]),
  };

  return useQuery({
    queryKey: getWorkflowsCacheKey(envKey, namespaceId),
    queryFn: () => api.workflows.getAll(requestParams),
    select: (res) => res.data,
  });
}

export function useDeleteWorkflow() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workflow: WorkflowItemInterface) => api.workflows.delete({ id: workflow.id }),
    onSuccess: (_, workflow) => {
      queryClient.removeQueries({ queryKey: getWorkflowCacheKey(envKey, workflow.id) });
      void queryClient.invalidateQueries({
        queryKey: getWorkflowsCacheKey(envKey, workflow.namespaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: getWorkflowsByPipelineCacheKey(envKey, workflow.pipelineId),
      });
    },
  });
}

export function useFetchAllWorkflows() {
  const { envKey, api } = useApiClient();

  const requestParams = {
    filter: JSON.stringify({}),
    sortBy: JSON.stringify([
      {
        field: 'index',
        order: 'ASC',
      } as WorkflowSortByInterface,
    ]),
  };

  return useQuery({
    queryKey: getAllWorkflowsCacheKey(envKey),
    queryFn: () => api.workflows.getAll(requestParams),
    select: (res) => res.data,
  });
}
