import { useMemo } from 'react';
import type { StudioDocumentConfig } from '@loopstack/contracts/api';
import { useAppsConfig } from '@loopstack/react';

export { useAppsConfig, useAvailableEnvironments } from '@loopstack/react';

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
