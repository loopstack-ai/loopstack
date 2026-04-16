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

// --- Config ---
export function getWorkspaceTypesCacheKey(envKey: string) {
  return ['workspace-types', envKey];
}

export function getWorkflowTypesCacheKey(envKey: string, workspaceBlockName: string) {
  return ['workflowTypes', envKey, workspaceBlockName];
}

export function getAvailableEnvironmentsCacheKey(envKey: string) {
  return ['available-environments', envKey];
}

// --- Dashboard ---
export function getDashboardStatsCacheKey(envKey: string) {
  return ['dashboard', 'stats', envKey];
}

// --- Workflows ---
export function getWorkflowCacheKey(envKey: string, id: string) {
  return ['workflow', envKey, id];
}

export function getWorkflowsCacheKey(envKey: string) {
  return ['workflows', envKey];
}

export function getChildWorkflowsCacheKey(envKey: string, parentId: string) {
  return ['childWorkflows', envKey, parentId];
}

export function getWorkflowConfigCacheKey(envKey: string, alias: string) {
  return ['workflowConfig', envKey, alias];
}

export function getWorkflowSourceCacheKey(envKey: string, alias: string) {
  return ['workflowSource', envKey, alias];
}

// --- Workspaces ---
export function getWorkspaceCacheKey(envKey: string, id: string) {
  return ['workspace', envKey, id];
}

export function getWorkspacesCacheKey(envKey: string) {
  return ['workspaces', envKey];
}

// --- Documents ---
export function getDocumentCacheKey(envKey: string, documentId: string) {
  return ['document', envKey, documentId];
}

export function getDocumentsCacheKey(envKey: string, workflowId: string) {
  return ['documents', envKey, workflowId];
}

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
