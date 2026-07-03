import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@loopstack/client';
import type {
  WorkflowConfigInterface,
  WorkflowFilterInterface,
  WorkflowSortByInterface,
  WorkflowSourceInterface,
} from '@loopstack/contracts/api';
import { useLoopstackClient, useChildWorkflows as useSdkChildWorkflows, useWorkflowList } from '@loopstack/react';
import { getWorkflowConfigCacheKey, getWorkflowSourceCacheKey } from './query-keys.ts';
import { useApiClient } from './useApi.ts';

export {
  useCreateWorkflow,
  useDeleteWorkflow,
  useUpdateWorkflow,
  useWorkflow,
  useWorkflowCheckpoints,
  useWorkflowStatus,
} from '@loopstack/react';

/**
 * Fetch a filtered, sorted, paginated list of workflows.
 */
export function useFilterWorkflows(
  searchTerm: string | undefined,
  filter: Record<string, string | null>,
  sortBy: string = 'id',
  order: string = 'DESC',
  page: number = 0,
  limit: number = 10,
) {
  return useWorkflowList({
    ...(Object.keys(filter).length > 0 && { filter: filter as WorkflowFilterInterface }),
    sortBy: [{ field: sortBy, order } as WorkflowSortByInterface],
    page,
    limit,
    ...(searchTerm && { search: searchTerm }),
  });
}

/**
 * Batch delete workflows.
 */
export function useBatchDeleteWorkflows() {
  const client = useLoopstackClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => client.workflows.batchDelete(ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workflows(client.envKey) });
    },
  });
}

/**
 * Fetch child workflows by parentId.
 */
export function useChildWorkflows(parentId: string | undefined, enabled: boolean = true) {
  return useSdkChildWorkflows(parentId, { select: (page) => page.data, enabled });
}

/**
 * Fetch workflow config by workflow name (the identifier stored on the workflow entity).
 */
export function useWorkflowConfigByName(workflowName: string | undefined) {
  const { envKey, api } = useApiClient();

  return useQuery<WorkflowConfigInterface>({
    queryKey: getWorkflowConfigCacheKey(envKey, workflowName!),
    queryFn: () => api.config.getWorkflowConfig({ workflowName: workflowName! }),
    enabled: !!workflowName,
  });
}

/**
 * Fetch workflow source by workflow name (class name).
 */
export function useWorkflowSource(workflowName: string | undefined) {
  const { envKey, api } = useApiClient();

  return useQuery<WorkflowSourceInterface>({
    queryKey: getWorkflowSourceCacheKey(envKey, workflowName!),
    queryFn: () => api.config.getWorkflowSource({ workflowName: workflowName! }),
    enabled: !!workflowName,
  });
}
