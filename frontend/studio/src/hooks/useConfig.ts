import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { StudioDocumentConfig } from '@/api/types';
import { getAvailableEnvironmentsCacheKey, getStudioAppsCacheKey } from './query-keys';
import { useApiClient } from './useApi';

export function useAppsConfig() {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: getStudioAppsCacheKey(envKey),
    queryFn: () => api.config.getApps(),
  });
}

export function useAvailableEnvironments(options?: { enabled?: boolean }) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: getAvailableEnvironmentsCacheKey(envKey),
    queryFn: () => api.config.getAvailableEnvironments(),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Returns a Map of document configs keyed by documentName.
 * Document configs are fetched as part of the apps config and are global (same across all apps).
 */
export function useDocumentConfigs(): Map<string, StudioDocumentConfig> {
  const { data: apps } = useAppsConfig();

  return useMemo(() => {
    const map = new Map<string, StudioDocumentConfig>();
    if (!apps?.length) return map;

    // Documents are global — use first app's documents (identical across apps)
    const documents = apps[0].documents ?? [];
    for (const doc of documents) {
      map.set(doc.documentName, doc);
    }
    return map;
  }, [apps]);
}
