import type {
  DocumentItemInterface,
  PaginatedInterface,
  WorkflowCheckpointInterface,
  WorkflowFullInterface,
  WorkflowItemInterface,
  WorkflowStatusInterface,
  WorkspaceInterface,
} from '@loopstack/contracts/api';
import { SortOrder } from '@loopstack/contracts/enums';
import type { DocumentsResource } from '../resources/documents.js';
import type { WorkflowListParams, WorkflowsResource } from '../resources/workflows.js';
import type { WorkspaceListParams, WorkspacesResource } from '../resources/workspaces.js';
import { queryKeys } from './query-keys.js';

interface QueryResources {
  envKey: string;
  workflows: WorkflowsResource;
  documents: DocumentsResource;
  workspaces: WorkspacesResource;
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
}

/**
 * `{ queryKey, queryFn }` descriptors — the host application owns the
 * QueryClient; the SDK only describes what to fetch and under which key.
 */
export function createQueries({ envKey, workflows, documents, workspaces }: QueryResources): LoopstackQueries {
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
  };
}
