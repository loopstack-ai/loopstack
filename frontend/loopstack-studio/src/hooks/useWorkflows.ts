import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from './useApi.ts';
import type { WorkflowItemDto, WorkflowSortByDto } from '@loopstack/api-client';
import type { WorkflowInterface } from '@loopstack/contracts/types';
import type { AxiosResponse } from 'axios';

export function getWorkflowsCacheKey(envKey: string, namespaceId: string) {
  return ['workflows', envKey, namespaceId];
}

export function getWorkflowCacheKey(envKey: string, workflowId: string) {
  return ['workflow', envKey, workflowId];
}

export function getWorkflowsByPipelineCacheKey(envKey: string, pipelineId: string) {
  return ['workflows-by-pipeline', envKey, pipelineId];
}

export function useWorkflow(id: string) {
  const { envKey, api } = useApiClient();

  return useQuery<AxiosResponse, Error, WorkflowInterface>({
    queryKey: getWorkflowCacheKey(envKey, id),
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
    queryKey: getWorkflowsByPipelineCacheKey(envKey, pipelineId),
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
    queryKey: getWorkflowsCacheKey(envKey, namespaceId),
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
      queryClient.removeQueries({ queryKey: getWorkflowCacheKey(envKey, workflow.id) });
      queryClient.invalidateQueries({ queryKey: getWorkflowsCacheKey(envKey, workflow.namespaceId) });
      queryClient.invalidateQueries({ queryKey: getWorkflowsByPipelineCacheKey(envKey, workflow.pipelineId) });
    }
  });
}
