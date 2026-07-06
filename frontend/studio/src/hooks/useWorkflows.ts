import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@loopstack/client';
import type { WorkflowFilterInterface, WorkflowSortByInterface } from '@loopstack/contracts/api';
import {
  useLoopstackClient,
  useChildWorkflows as useSdkChildWorkflows,
  useWorkflowConfig,
  useWorkflowList,
} from '@loopstack/react';

export {
  useCreateWorkflow,
  useDeleteWorkflow,
  useUpdateWorkflow,
  useWorkflow,
  useWorkflowCheckpoints,
  useWorkflowSource,
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
  return useWorkflowConfig(workflowName);
}
