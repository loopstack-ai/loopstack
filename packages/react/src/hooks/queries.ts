import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { WorkflowListParams } from '@loopstack/client';
import type {
  DocumentItemInterface,
  PaginatedInterface,
  WorkflowCheckpointInterface,
  WorkflowFullInterface,
  WorkflowItemInterface,
  WorkflowStatusInterface,
} from '@loopstack/contracts/api';
import { useLoopstackClient } from '../provider.js';

/**
 * Host-controlled query behavior (staleTime, refetchInterval, select, …) —
 * everything except the key and fetcher, which the SDK owns.
 */
export type QueryHookOptions<TQueryFnData, TData = TQueryFnData> = Omit<
  UseQueryOptions<TQueryFnData, Error, TData>,
  'queryKey' | 'queryFn'
>;

/** Fetch a single workflow (full details) by ID. */
export function useWorkflow<TData = WorkflowFullInterface>(
  id: string | undefined,
  options?: QueryHookOptions<WorkflowFullInterface, TData>,
): UseQueryResult<TData> {
  const client = useLoopstackClient();
  return useQuery({
    ...client.queries.workflow(id!),
    ...options,
    enabled: !!id && (options?.enabled ?? true),
  });
}

/**
 * Fetch the slim live status of a single workflow — reacts to state changes
 * without pulling the full workflow payload.
 */
export function useWorkflowStatus<TData = WorkflowStatusInterface>(
  id: string | undefined,
  options?: QueryHookOptions<WorkflowStatusInterface, TData>,
): UseQueryResult<TData> {
  const client = useLoopstackClient();
  return useQuery({
    ...client.queries.workflowStatus(id!),
    ...options,
    enabled: !!id && (options?.enabled ?? true),
  });
}

/** Fetch a filtered, sorted, paginated list of workflows. */
export function useWorkflowList<TData = PaginatedInterface<WorkflowItemInterface>>(
  params?: WorkflowListParams,
  options?: QueryHookOptions<PaginatedInterface<WorkflowItemInterface>, TData>,
): UseQueryResult<TData> {
  const client = useLoopstackClient();
  return useQuery({
    ...client.queries.workflowList(params),
    ...options,
  });
}

/** Fetch the child workflows of a parent run, oldest first. */
export function useChildWorkflows<TData = PaginatedInterface<WorkflowItemInterface>>(
  parentId: string | undefined,
  options?: QueryHookOptions<PaginatedInterface<WorkflowItemInterface>, TData>,
): UseQueryResult<TData> {
  const client = useLoopstackClient();
  return useQuery({
    ...client.queries.childWorkflows(parentId!),
    ...options,
    enabled: !!parentId && (options?.enabled ?? true),
  });
}

/** Fetch the checkpoints of a workflow run. */
export function useWorkflowCheckpoints<TData = WorkflowCheckpointInterface[]>(
  id: string | undefined,
  options?: QueryHookOptions<WorkflowCheckpointInterface[], TData>,
): UseQueryResult<TData> {
  const client = useLoopstackClient();
  return useQuery({
    ...client.queries.workflowCheckpoints(id!),
    ...options,
    enabled: !!id && (options?.enabled ?? true),
  });
}

/** Fetch a single document by ID. */
export function useDocument<TData = DocumentItemInterface>(
  id: string | undefined,
  options?: QueryHookOptions<DocumentItemInterface, TData>,
): UseQueryResult<TData> {
  const client = useLoopstackClient();
  return useQuery({
    ...client.queries.document(id!),
    ...options,
    enabled: !!id && (options?.enabled ?? true),
  });
}

/** Fetch the visible documents of a workflow run, in display order. */
export function useWorkflowDocuments<TData = PaginatedInterface<DocumentItemInterface>>(
  workflowId: string | undefined,
  options?: QueryHookOptions<PaginatedInterface<DocumentItemInterface>, TData>,
): UseQueryResult<TData> {
  const client = useLoopstackClient();
  return useQuery({
    ...client.queries.documents(workflowId!),
    ...options,
    enabled: !!workflowId && (options?.enabled ?? true),
  });
}
