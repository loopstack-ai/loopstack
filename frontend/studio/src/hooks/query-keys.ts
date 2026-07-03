/**
 * Centralized cache key builders for React Query.
 *
 * Conventions:
 * - All keys start with a domain prefix, followed by envKey for environment scoping.
 * - Singular keys (e.g. 'workflow') are for single-entity queries.
 * - Plural keys (e.g. 'workflows') are for list/filter queries.
 * - Mutations should invalidate the plural key to catch all list variations.
 * - Use `select` (not `.then()` in queryFn) for response transformations.
 */

// --- Auth ---
export function getMeCacheKey(envKey: string) {
  return ['me', envKey];
}

export function getHealthCacheKey(envKey: string) {
  return ['health', envKey];
}

// --- Config / Dashboard / Workflows ---
// SDK-slice keys (workflow, workflows, childWorkflows, document, documents,
// apps, workflowConfig, workflowSource, toolConfigs, toolConfig,
// availableEnvironments, dashboardStats, …) live in the SDK:
// import { queryKeys } from '@loopstack/client'.

// --- Workspaces ---
// Workspace keys (workspace, workspaces, workspaceList) live in the SDK:
// import { queryKeys } from '@loopstack/client'.

// --- Secrets ---
export function getSecretsCacheKey(envKey: string, workspaceId: string) {
  return ['secrets', envKey, workspaceId];
}

// --- Git ---
export function getGitStatusCacheKey(envKey: string, workspaceId: string) {
  return ['gitStatus', envKey, workspaceId];
}

export function getGitLogCacheKey(envKey: string, workspaceId: string) {
  return ['gitLog', envKey, workspaceId];
}

export function getGitRemoteCacheKey(envKey: string, workspaceId: string) {
  return ['gitRemote', envKey, workspaceId];
}

// --- Files ---
export function getFileTreeCacheKey(envKey: string, workflowId: string) {
  return ['fileTree', envKey, workflowId];
}

export function getFileContentCacheKey(envKey: string, workflowId: string, filePath: string) {
  return ['fileContent', envKey, workflowId, filePath];
}
