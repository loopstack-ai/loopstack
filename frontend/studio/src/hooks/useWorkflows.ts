import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  WorkflowConfigInterface,
  WorkflowCreateInterface,
  WorkflowFullInterface,
  WorkflowSortByInterface,
  WorkflowSourceInterface,
  WorkflowUpdateInterface,
} from '@loopstack/contracts/api';
import type { WorkflowCheckpoint } from '../api/workflows.ts';
import {
  getChildWorkflowsCacheKey,
  getWorkflowCacheKey,
  getWorkflowConfigCacheKey,
  getWorkflowSourceCacheKey,
  getWorkflowsCacheKey,
} from './query-keys.ts';
import { useApiClient } from './useApi.ts';

/**
 * Fetch a single workflow (full details) by ID.
 */
export function useWorkflow(id: string | undefined) {
  const { envKey, api } = useApiClient();

  return useQuery<WorkflowFullInterface>({
    queryKey: getWorkflowCacheKey(envKey, id!),
    queryFn: () => api.workflows.getById({ id: id! }),
    enabled: !!id,
  });
}

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
  const { envKey, api } = useApiClient();

  const hasFilter = Object.keys(filter).length > 0;
  const filterStr = hasFilter ? JSON.stringify(filter) : undefined;

  const requestParams = {
    ...(filterStr && { filter: filterStr }),
    sortBy: JSON.stringify([
      {
        field: sortBy,
        order: order,
      } as WorkflowSortByInterface,
    ]),
    page,
    limit,
    ...(searchTerm && { search: searchTerm, searchColumns: JSON.stringify(['title', 'model']) }),
  };

  return useQuery({
    queryKey: [...getWorkflowsCacheKey(envKey), 'list', searchTerm ?? '', filterStr ?? '', sortBy, order, page, limit],
    queryFn: () => api.workflows.getAll(requestParams),
  });
}

/**
 * Create a new workflow.
 */
export function useCreateWorkflow() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { workflowCreateDto: WorkflowCreateInterface }) => api.workflows.create(params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getWorkflowsCacheKey(envKey) });
    },
  });
}

/**
 * Update an existing workflow.
 */
export function useUpdateWorkflow() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; workflowUpdateDto: WorkflowUpdateInterface }) => api.workflows.update(params),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: getWorkflowCacheKey(envKey, variables.id) });
      void queryClient.invalidateQueries({ queryKey: getWorkflowsCacheKey(envKey) });
    },
  });
}

/**
 * Delete a single workflow.
 */
export function useDeleteWorkflow() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.workflows.delete({ id }),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: getWorkflowCacheKey(envKey, id) });
      void queryClient.invalidateQueries({ queryKey: getWorkflowsCacheKey(envKey) });
    },
  });
}

/**
 * Batch delete workflows.
 */
export function useBatchDeleteWorkflows() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => api.workflows.batchDelete({ ids }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getWorkflowsCacheKey(envKey) });
    },
  });
}

/**
 * Fetch child workflows by parentId.
 */
export function useChildWorkflows(parentId: string | undefined, enabled: boolean = true) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: getChildWorkflowsCacheKey(envKey, parentId!),
    queryFn: () =>
      api.workflows.getAll({
        filter: JSON.stringify({ parentId }),
        sortBy: JSON.stringify([{ field: 'createdAt', order: 'ASC' } as WorkflowSortByInterface]),
        page: 0,
        limit: 100,
      }),
    select: (res) => res.data,
    enabled: enabled && !!parentId,
  });
}

/**
 * Fetch workflow config by block name (class name).
 */
export function useWorkflowConfigByName(alias: string | undefined) {
  const { envKey, api } = useApiClient();

  return useQuery<WorkflowConfigInterface>({
    queryKey: getWorkflowConfigCacheKey(envKey, alias!),
    queryFn: () => api.config.getWorkflowConfig({ alias: alias! }),
    enabled: !!alias,
  });
}

/**
 * Fetch workflow source by block name (class name).
 */
export function useWorkflowSource(alias: string | undefined) {
  const { envKey, api } = useApiClient();

  return useQuery<WorkflowSourceInterface>({
    queryKey: getWorkflowSourceCacheKey(envKey, alias!),
    queryFn: () => api.config.getWorkflowSource({ alias: alias! }),
    enabled: !!alias,
  });
}

/**
 * Fetch checkpoints for a workflow run.
 */
export function useWorkflowCheckpoints(workflowId: string) {
  const { envKey, api } = useApiClient();

  return useQuery<WorkflowCheckpoint[]>({
    queryKey: [...getWorkflowCacheKey(envKey, workflowId), 'checkpoints'],
    queryFn: () => api.workflows.getCheckpoints({ id: workflowId }),
    enabled: !!workflowId,
  });
}
