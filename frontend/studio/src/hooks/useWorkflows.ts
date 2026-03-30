import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { WorkflowItemInterface, WorkflowSortByInterface } from '@loopstack/contracts/api';
import type { WorkflowInterface } from '@loopstack/contracts/types';
import type { WorkflowCheckpoint } from '../api/workflows.ts';
import { getAllWorkflowsCacheKey, getWorkflowCacheKey, getWorkflowsByPipelineCacheKey } from './query-keys.ts';
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
        field: 'createdAt',
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

export function useDeleteWorkflow() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workflow: WorkflowItemInterface) => api.workflows.delete({ id: workflow.id }),
    onSuccess: (_, workflow) => {
      queryClient.removeQueries({ queryKey: getWorkflowCacheKey(envKey, workflow.id) });
      void queryClient.invalidateQueries({
        queryKey: getWorkflowsByPipelineCacheKey(envKey, workflow.pipelineId),
      });
    },
  });
}

export function useWorkflowCheckpoints(workflowId: string) {
  const { envKey, api } = useApiClient();

  return useQuery<WorkflowCheckpoint[]>({
    queryKey: [...getWorkflowCacheKey(envKey, workflowId), 'checkpoints'],
    queryFn: () => api.workflows.getCheckpoints({ id: workflowId }),
    enabled: !!workflowId,
  });
}

export function useFetchAllWorkflows() {
  const { envKey, api } = useApiClient();

  const requestParams = {
    filter: JSON.stringify({}),
    sortBy: JSON.stringify([
      {
        field: 'createdAt',
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
