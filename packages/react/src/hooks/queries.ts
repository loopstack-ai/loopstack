import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { type DocumentScope, type DocumentWindow, fetchDocumentsBefore, queryKeys } from '@loopstack/client';
import type { WorkflowListParams, WorkspaceListParams } from '@loopstack/client';
import type {
  AuthUserInterface,
  AvailableEnvironmentInterface,
  DashboardStatsInterface,
  DocumentItemInterface,
  PaginatedInterface,
  StudioAppConfig,
  ToolConfigInterface,
  WorkerInfoInterface,
  WorkflowCheckpointInterface,
  WorkflowConfigInterface,
  WorkflowFullInterface,
  WorkflowItemInterface,
  WorkflowSourceInterface,
  WorkflowStatusInterface,
  WorkspaceInterface,
} from '@loopstack/contracts/api';
import { useLoopstackClient } from '../provider.js';

/** Stable empty list, so a window that hasn't loaded yet doesn't change identity on every render. */
const EMPTY_DOCUMENTS: DocumentItemInterface[] = [];

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

export interface UseWorkflowDocumentsResult {
  /** The loaded documents, oldest first. */
  documents: DocumentItemInterface[];
  /** How many documents the run has in total — `documents.length` when everything is loaded. */
  total: number;
  /** Older documents exist beyond the loaded window; {@link loadOlder} fetches the next page back. */
  hasOlder: boolean;
  /** Prepend the page of documents before the oldest loaded one. */
  loadOlder: () => Promise<void>;
  isLoadingOlder: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  error: Error | null;
}

/**
 * The newest documents of a workflow run, in display order, with history on demand.
 *
 * A run's document list is unbounded, so this opens on the live end (the newest
 * {@link DOCUMENT_WINDOW_SIZE}) rather than the start, and `loadOlder()` walks backwards a page at a time.
 * New and re-saved documents arrive through {@link useLiveDocuments}, which merges them into this window.
 */
export function useWorkflowDocuments(
  workflowId: string | undefined,
  scope: DocumentScope = 'current',
): UseWorkflowDocumentsResult {
  const client = useLoopstackClient();
  const queryClient = useQueryClient();
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const query = useQuery({ ...client.queries.documents(workflowId!, scope), enabled: !!workflowId });

  const documents = query.data?.documents ?? EMPTY_DOCUMENTS;
  const total = query.data?.total ?? 0;

  const loadOlder = useCallback(async () => {
    const oldest = documents[0];
    if (!workflowId || !oldest) return;
    setIsLoadingOlder(true);
    try {
      const older = await fetchDocumentsBefore(client.documents, workflowId, oldest.index, scope);
      if (older.length === 0) return;
      queryClient.setQueryData<DocumentWindow>(
        queryKeys.documents(client.envKey, workflowId, scope),
        (current) => current && { ...current, documents: [...older, ...current.documents] },
      );
    } finally {
      setIsLoadingOlder(false);
    }
  }, [client, queryClient, workflowId, scope, documents]);

  return {
    documents,
    total,
    hasOlder: documents.length < total,
    loadOlder,
    isLoadingOlder,
    isLoading: query.isLoading,
    isSuccess: query.isSuccess,
    error: query.error,
  };
}

/** Fetch a single workspace by ID. */
export function useWorkspace<TData = WorkspaceInterface>(
  id: string | undefined,
  options?: QueryHookOptions<WorkspaceInterface, TData>,
): UseQueryResult<TData> {
  const client = useLoopstackClient();
  return useQuery({
    ...client.queries.workspace(id!),
    ...options,
    enabled: !!id && (options?.enabled ?? true),
  });
}

/** Fetch a filtered, sorted, paginated list of workspaces. */
export function useWorkspaceList<TData = PaginatedInterface<WorkspaceInterface>>(
  params?: WorkspaceListParams,
  options?: QueryHookOptions<PaginatedInterface<WorkspaceInterface>, TData>,
): UseQueryResult<TData> {
  const client = useLoopstackClient();
  return useQuery({
    ...client.queries.workspaceList(params),
    ...options,
  });
}

/** Fetch every @StudioApp of the backend with its workflows, documents, and UI config. */
export function useAppsConfig<TData = StudioAppConfig[]>(
  options?: QueryHookOptions<StudioAppConfig[], TData>,
): UseQueryResult<TData> {
  const client = useLoopstackClient();
  return useQuery({
    ...client.queries.apps(),
    ...options,
  });
}

/** Fetch the resolved config (transitions, args schema, UI) of a workflow by name. */
export function useWorkflowConfig<TData = WorkflowConfigInterface>(
  workflowName: string | undefined,
  options?: QueryHookOptions<WorkflowConfigInterface, TData>,
): UseQueryResult<TData> {
  const client = useLoopstackClient();
  return useQuery({
    ...client.queries.workflowConfig(workflowName!),
    ...options,
    enabled: !!workflowName && (options?.enabled ?? true),
  });
}

/** Fetch the source file of a workflow by name, when the backend can resolve it. */
export function useWorkflowSource<TData = WorkflowSourceInterface>(
  workflowName: string | undefined,
  options?: QueryHookOptions<WorkflowSourceInterface, TData>,
): UseQueryResult<TData> {
  const client = useLoopstackClient();
  return useQuery({
    ...client.queries.workflowSource(workflowName!),
    ...options,
    enabled: !!workflowName && (options?.enabled ?? true),
  });
}

/** Fetch the configs of all registered tools. */
export function useToolConfigs<TData = ToolConfigInterface[]>(
  options?: QueryHookOptions<ToolConfigInterface[], TData>,
): UseQueryResult<TData> {
  const client = useLoopstackClient();
  return useQuery({
    ...client.queries.toolConfigs(),
    ...options,
  });
}

/** Fetch a single tool config by name. */
export function useToolConfig<TData = ToolConfigInterface>(
  toolName: string | undefined,
  options?: QueryHookOptions<ToolConfigInterface, TData>,
): UseQueryResult<TData> {
  const client = useLoopstackClient();
  return useQuery({
    ...client.queries.toolConfig(toolName!),
    ...options,
    enabled: !!toolName && (options?.enabled ?? true),
  });
}

/** Fetch the environments the backend offers for workspace slots. */
export function useAvailableEnvironments<TData = AvailableEnvironmentInterface[]>(
  options?: QueryHookOptions<AvailableEnvironmentInterface[], TData>,
): UseQueryResult<TData> {
  const client = useLoopstackClient();
  return useQuery({
    ...client.queries.availableEnvironments(),
    ...options,
  });
}

/** Fetch aggregated run statistics across all workspaces. */
export function useDashboardStats<TData = DashboardStatsInterface>(
  options?: QueryHookOptions<DashboardStatsInterface, TData>,
): UseQueryResult<TData> {
  const client = useLoopstackClient();
  return useQuery({
    ...client.queries.dashboardStats(),
    ...options,
  });
}

/**
 * Fetch the authenticated user. Errors with 401 on backends with auth
 * enabled and no session — defaults to no retries so hosts can react fast.
 */
export function useMe<TData = AuthUserInterface>(
  options?: QueryHookOptions<AuthUserInterface, TData>,
): UseQueryResult<TData> {
  const client = useLoopstackClient();
  return useQuery({
    ...client.queries.me(),
    retry: false,
    ...options,
  });
}

/** Fetch the backend's public liveness/config probe. */
export function useWorkerHealth<TData = WorkerInfoInterface>(
  options?: QueryHookOptions<WorkerInfoInterface, TData>,
): UseQueryResult<TData> {
  const client = useLoopstackClient();
  return useQuery({
    ...client.queries.workerHealth(),
    ...options,
  });
}
