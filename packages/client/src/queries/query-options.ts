import type {
  AuthUserInterface,
  AvailableEnvironmentInterface,
  DashboardStatsInterface,
  DocumentFilterInterface,
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
import { SortOrder } from '@loopstack/contracts/enums';
import type { AuthResource } from '../resources/auth.js';
import type { ConfigResource } from '../resources/config.js';
import type { DashboardResource } from '../resources/dashboard.js';
import type { DocumentsResource } from '../resources/documents.js';
import type { WorkflowListParams, WorkflowsResource } from '../resources/workflows.js';
import type { WorkspaceListParams, WorkspacesResource } from '../resources/workspaces.js';
import { type DocumentScope, queryKeys } from './query-keys.js';

interface QueryResources {
  envKey: string;
  workflows: WorkflowsResource;
  documents: DocumentsResource;
  workspaces: WorkspacesResource;
  config: ConfigResource;
  dashboard: DashboardResource;
  auth: AuthResource;
}

/**
 * How many documents a window holds — the newest ones of a run. A run's history can be arbitrarily long, so
 * views open on its live end and walk backwards on demand ({@link fetchDocumentsBefore}) instead of loading
 * everything.
 */
export const DOCUMENT_WINDOW_SIZE = 200;

/**
 * A slice of a run's documents: the loaded ones in display order (oldest first), plus how many the run has
 * in total — the difference is what "load older" can still fetch.
 */
export interface DocumentWindow {
  documents: DocumentItemInterface[];
  total: number;
}

function documentFilter(workflowId: string, scope: DocumentScope): DocumentFilterInterface {
  return { workflowId, ...(scope === 'all' ? {} : { isInvalidated: false }) };
}

/** The newest {@link DOCUMENT_WINDOW_SIZE} documents of a run, returned oldest-first for display. */
export async function fetchDocumentWindow(
  documents: DocumentsResource,
  workflowId: string,
  scope: DocumentScope = 'current',
): Promise<DocumentWindow> {
  const page = await documents.list({
    filter: documentFilter(workflowId, scope),
    sortBy: [{ field: 'index', order: SortOrder.DESC }],
    limit: DOCUMENT_WINDOW_SIZE,
  });
  return { documents: [...page.data].reverse(), total: page.total };
}

/**
 * Documents written after `updatedAfter` — the live delta. Covers new documents and re-saved ones alike
 * (a re-save keeps its `index` but bumps `updatedAt`), so a caller merges the result by id.
 */
export function fetchDocumentsSince(
  documents: DocumentsResource,
  workflowId: string,
  updatedAfter: string,
  scope: DocumentScope = 'current',
): Promise<PaginatedInterface<DocumentItemInterface>> {
  return documents.list({
    filter: { ...documentFilter(workflowId, scope), updatedAfter },
    sortBy: [{ field: 'index', order: SortOrder.ASC }],
    limit: DOCUMENT_WINDOW_SIZE,
  });
}

/** The page of documents just before `beforeIndex`, oldest-first — one step back through a run's history. */
export async function fetchDocumentsBefore(
  documents: DocumentsResource,
  workflowId: string,
  beforeIndex: number,
  scope: DocumentScope = 'current',
): Promise<DocumentItemInterface[]> {
  const page = await documents.list({
    filter: { ...documentFilter(workflowId, scope), beforeIndex },
    sortBy: [{ field: 'index', order: SortOrder.DESC }],
    limit: DOCUMENT_WINDOW_SIZE,
  });
  return [...page.data].reverse();
}

/** A `queryOptions`-shaped descriptor consumable by any TanStack Query version. */
export interface QueryDescriptor<T> {
  queryKey: readonly unknown[];
  queryFn: () => Promise<T>;
}

export interface LoopstackQueries {
  workflow: (id: string) => QueryDescriptor<WorkflowFullInterface>;
  workflowStatus: (id: string) => QueryDescriptor<WorkflowStatusInterface>;
  workflowList: (params?: WorkflowListParams) => QueryDescriptor<PaginatedInterface<WorkflowItemInterface>>;
  childWorkflows: (parentId: string) => QueryDescriptor<PaginatedInterface<WorkflowItemInterface>>;
  workflowCheckpoints: (id: string) => QueryDescriptor<WorkflowCheckpointInterface[]>;
  document: (id: string) => QueryDescriptor<DocumentItemInterface>;
  /** The newest documents of a workflow run, in display order — see {@link DocumentWindow}. */
  documents: (workflowId: string, scope?: DocumentScope) => QueryDescriptor<DocumentWindow>;
  workspace: (id: string) => QueryDescriptor<WorkspaceInterface>;
  workspaceList: (params?: WorkspaceListParams) => QueryDescriptor<PaginatedInterface<WorkspaceInterface>>;
  apps: () => QueryDescriptor<StudioAppConfig[]>;
  workflowConfig: (workflowName: string) => QueryDescriptor<WorkflowConfigInterface>;
  workflowSource: (workflowName: string) => QueryDescriptor<WorkflowSourceInterface>;
  toolConfigs: () => QueryDescriptor<ToolConfigInterface[]>;
  toolConfig: (toolName: string) => QueryDescriptor<ToolConfigInterface>;
  availableEnvironments: () => QueryDescriptor<AvailableEnvironmentInterface[]>;
  dashboardStats: () => QueryDescriptor<DashboardStatsInterface>;
  me: () => QueryDescriptor<AuthUserInterface>;
  workerHealth: () => QueryDescriptor<WorkerInfoInterface>;
}

/**
 * `{ queryKey, queryFn }` descriptors — the host application owns the
 * QueryClient; the SDK only describes what to fetch and under which key.
 */
export function createQueries({
  envKey,
  workflows,
  documents,
  workspaces,
  config,
  dashboard,
  auth,
}: QueryResources): LoopstackQueries {
  return {
    workflow: (id: string) => ({
      queryKey: queryKeys.workflow(envKey, id),
      queryFn: () => workflows.get(id),
    }),

    workflowStatus: (id: string) => ({
      queryKey: queryKeys.workflowStatus(envKey, id),
      queryFn: () => workflows.status(id),
    }),

    workflowList: (params: WorkflowListParams = {}) => ({
      queryKey: queryKeys.workflowList(envKey, params),
      queryFn: () => workflows.list(params),
    }),

    childWorkflows: (parentId: string) => ({
      queryKey: queryKeys.childWorkflows(envKey, parentId),
      queryFn: () =>
        workflows.list({
          filter: { parentId },
          sortBy: [{ field: 'createdAt', order: SortOrder.ASC }],
          page: 0,
          limit: 100,
        }),
    }),

    workflowCheckpoints: (id: string) => ({
      queryKey: queryKeys.workflowCheckpoints(envKey, id),
      queryFn: () => workflows.checkpoints(id),
    }),

    document: (id: string) => ({
      queryKey: queryKeys.document(envKey, id),
      queryFn: () => documents.get(id),
    }),

    documents: (workflowId: string, scope: DocumentScope = 'current') => ({
      queryKey: queryKeys.documents(envKey, workflowId, scope),
      queryFn: () => fetchDocumentWindow(documents, workflowId, scope),
    }),

    workspace: (id: string) => ({
      queryKey: queryKeys.workspace(envKey, id),
      queryFn: () => workspaces.get(id),
    }),

    workspaceList: (params: WorkspaceListParams = {}) => ({
      queryKey: queryKeys.workspaceList(envKey, params),
      queryFn: () => workspaces.list(params),
    }),

    apps: () => ({
      queryKey: queryKeys.apps(envKey),
      queryFn: () => config.apps(),
    }),

    workflowConfig: (workflowName: string) => ({
      queryKey: queryKeys.workflowConfig(envKey, workflowName),
      queryFn: () => config.workflowConfig(workflowName),
    }),

    workflowSource: (workflowName: string) => ({
      queryKey: queryKeys.workflowSource(envKey, workflowName),
      queryFn: () => config.workflowSource(workflowName),
    }),

    toolConfigs: () => ({
      queryKey: queryKeys.toolConfigs(envKey),
      queryFn: () => config.tools(),
    }),

    toolConfig: (toolName: string) => ({
      queryKey: queryKeys.toolConfig(envKey, toolName),
      queryFn: () => config.tool(toolName),
    }),

    availableEnvironments: () => ({
      queryKey: queryKeys.availableEnvironments(envKey),
      queryFn: () => config.availableEnvironments(),
    }),

    dashboardStats: () => ({
      queryKey: queryKeys.dashboardStats(envKey),
      queryFn: () => dashboard.stats(),
    }),

    me: () => ({
      queryKey: queryKeys.me(envKey),
      queryFn: () => auth.me(),
    }),

    workerHealth: () => ({
      queryKey: queryKeys.workerHealth(envKey),
      queryFn: () => auth.workerHealth(),
    }),
  };
}
