import { useCallback } from 'react';
import type { WorkspaceEnvironmentInterface } from '@loopstack/contracts/api';

/**
 * Returns a default getEnvironmentPreviewUrl function that builds
 * embed preview URLs for local/standalone environments.
 *
 * This can be overridden by passing a custom function (e.g. from the cloud frontend).
 */
export function useDefaultEnvironmentPreviewUrl() {
  return useCallback((env: WorkspaceEnvironmentInterface, workflowId?: string) => {
    if (!env.connectionUrl) return '';
    const params = new URLSearchParams({
      url: env.connectionUrl,
      name: env.envName || env.workerId || '',
    });
    const base = `/embed/env/preview`;
    return workflowId ? `${base}/workflows/${workflowId}?${params}` : `${base}?${params}`;
  }, []);
}
