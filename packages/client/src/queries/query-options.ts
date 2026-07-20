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
import { SortOrder } from '@loopstack/contracts/enums';
import type { AuthResource } from '../resources/auth.js';
import type { ConfigResource } from '../resources/config.js';
import type { DashboardResource } from '../resources/dashboard.js';
import type { DocumentsResource } from '../resources/documents.js';
import type { WorkflowListParams, WorkflowsResource } from '../resources/workflows.js';
import type { WorkspaceListParams, WorkspacesResource } from '../resources/workspaces.js';
import { queryKeys } from './query-keys.js';

interface QueryResources {
  envKey: string;
  workflows: WorkflowsResource;
  documents: DocumentsResource;
  workspaces: WorkspacesResource;
  config: ConfigResource;
  dashboard: DashboardResource;
  auth: AuthResource;
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
  /** The visible documents of a workflow run, in display order. */
  documents: (workflowId: string) => QueryDescriptor<PaginatedInterface<DocumentItemInterface>>;
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

    documents: (workflowId: string) => ({
      queryKey: queryKeys.documents(envKey, workflowId),
      queryFn: () =>
        documents.list({
          filter: { workflowId, isInvalidated: false },
          sortBy: [{ field: 'index', order: SortOrder.ASC }],
        }),
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
