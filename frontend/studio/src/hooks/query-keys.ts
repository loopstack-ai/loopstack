/**
 * Centralized cache key builders for React Query.
 *
 * Conventions:
 * - All keys start with a domain prefix, followed by envKey for environment scoping.
 * - Singular keys (e.g. 'pipeline') are for single-entity queries.
 * - Plural keys (e.g. 'pipelines') are for list/filter queries.
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

export function getPipelineTypesCacheKey(envKey: string, workspaceBlockName: string) {
  return ['pipeline-types', envKey, workspaceBlockName];
}

export function getAvailableEnvironmentsCacheKey(envKey: string) {
  return ['available-environments', envKey];
}

// --- Dashboard ---
export function getDashboardStatsCacheKey(envKey: string) {
  return ['dashboard', 'stats', envKey];
}

// --- Pipelines ---
export function getPipelineCacheKey(envKey: string, id: string) {
  return ['pipeline', envKey, id];
}

export function getPipelinesCacheKey(envKey: string) {
  return ['pipelines', envKey];
}

export function getPipelinesChildrenCacheKey(envKey: string, parentId: string) {
  return ['pipelines', 'children', envKey, parentId];
}

export function getPipelineConfigCacheKey(envKey: string, workspaceBlockName: string, pipelineBlockName: string) {
  return ['pipelineConfig', envKey, workspaceBlockName, pipelineBlockName];
}

export function getPipelineSourceCacheKey(envKey: string, workspaceBlockName: string, pipelineBlockName: string) {
  return ['pipelineSource', envKey, workspaceBlockName, pipelineBlockName];
}

// --- Workspaces ---
export function getWorkspaceCacheKey(envKey: string, id: string) {
  return ['workspace', envKey, id];
}

export function getWorkspacesCacheKey(envKey: string) {
  return ['workspaces', envKey];
}

// --- Workflows ---
export function getWorkflowCacheKey(envKey: string, workflowId: string) {
  return ['workflow', envKey, workflowId];
}

export function getWorkflowsCacheKey(envKey: string, namespaceId: string) {
  return ['workflows', envKey, namespaceId];
}

export function getWorkflowsByPipelineCacheKey(envKey: string, pipelineId: string) {
  return ['workflows-by-pipeline', envKey, pipelineId];
}

export function getAllWorkflowsCacheKey(envKey: string) {
  return ['all-workflows', envKey];
}

// --- Namespaces ---
export function getNamespaceCacheKey(envKey: string, namespaceId: string) {
  return ['namespace', envKey, namespaceId];
}

export function getNamespacesByPipelineCacheKey(envKey: string, pipelineId: string) {
  return ['namespaces', envKey, pipelineId];
}

// --- Documents ---
export function getDocumentCacheKey(envKey: string, documentId: string) {
  return ['document', envKey, documentId];
}

export function getDocumentsCacheKey(envKey: string, workflowId: string) {
  return ['documents', envKey, workflowId];
}

// --- Files ---
export function getFileTreeCacheKey(envKey: string, pipelineId: string) {
  return ['fileTree', envKey, pipelineId];
}

export function getFileContentCacheKey(envKey: string, pipelineId: string, filePath: string) {
  return ['fileContent', envKey, pipelineId, filePath];
}
