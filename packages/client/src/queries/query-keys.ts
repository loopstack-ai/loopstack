import type { WorkflowListParams } from '../resources/workflows.js';
import type { WorkspaceListParams } from '../resources/workspaces.js';

/**
 * Cache key builders shared by every Loopstack client surface.
 *
 * Conventions:
 * - Keys start with a domain prefix, followed by `envKey` for environment scoping.
 * - Singular keys (`workflow`) address single entities; plural keys
 *   (`workflows`) prefix all list variations, so invalidating the plural key
 *   catches every filtered/paginated list.
 */
export const queryKeys = {
  workflow: (envKey: string, id: string) => ['workflow', envKey, id] as const,
  workflowStatus: (envKey: string, id: string) => ['workflowStatus', envKey, id] as const,
  workflows: (envKey: string) => ['workflows', envKey] as const,
  workflowList: (envKey: string, params: WorkflowListParams = {}) => ['workflows', envKey, 'list', params] as const,
  childWorkflows: (envKey: string, parentId: string) => ['childWorkflows', envKey, parentId] as const,
  workflowCheckpoints: (envKey: string, id: string) => ['workflow', envKey, id, 'checkpoints'] as const,
  workspace: (envKey: string, id: string) => ['workspace', envKey, id] as const,
  workspaces: (envKey: string) => ['workspaces', envKey] as const,
  workspaceList: (envKey: string, params: WorkspaceListParams = {}) => ['workspaces', envKey, 'list', params] as const,
  me: (envKey: string) => ['me', envKey] as const,
  workerHealth: (envKey: string) => ['workerHealth', envKey] as const,
  apps: (envKey: string) => ['apps', envKey] as const,
  workflowConfig: (envKey: string, workflowName: string) => ['workflowConfig', envKey, workflowName] as const,
  workflowSource: (envKey: string, workflowName: string) => ['workflowSource', envKey, workflowName] as const,
  toolConfigs: (envKey: string) => ['toolConfigs', envKey] as const,
  toolConfig: (envKey: string, toolName: string) => ['toolConfig', envKey, toolName] as const,
  availableEnvironments: (envKey: string) => ['availableEnvironments', envKey] as const,
  dashboardStats: (envKey: string) => ['dashboardStats', envKey] as const,
  document: (envKey: string, id: string) => ['document', envKey, id] as const,
  documents: (envKey: string, workflowId: string) => ['documents', envKey, workflowId] as const,
  secrets: (envKey: string, workspaceId: string) => ['secrets', envKey, workspaceId] as const,
  gitStatus: (envKey: string, workspaceId: string) => ['gitStatus', envKey, workspaceId] as const,
  gitLog: (envKey: string, workspaceId: string) => ['gitLog', envKey, workspaceId] as const,
  gitRemote: (envKey: string, workspaceId: string) => ['gitRemote', envKey, workspaceId] as const,
};
