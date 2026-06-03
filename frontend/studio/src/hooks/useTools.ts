import { useQuery } from '@tanstack/react-query';
import type { ToolConfigInterface } from '@loopstack/contracts/api';
import { getToolConfigCacheKey, getToolConfigsCacheKey } from './query-keys.ts';
import { useApiClient } from './useApi.ts';

/**
 * Fetch all tool configs (name, description, ui widgets).
 */
export function useToolConfigs() {
  const { envKey, api } = useApiClient();

  return useQuery<ToolConfigInterface[]>({
    queryKey: getToolConfigsCacheKey(envKey),
    queryFn: () => api.config.getToolConfigs(),
  });
}

/**
 * Fetch a single tool config by name.
 */
export function useToolConfig(toolName: string | undefined) {
  const { envKey, api } = useApiClient();

  return useQuery<ToolConfigInterface>({
    queryKey: getToolConfigCacheKey(envKey, toolName!),
    queryFn: () => api.config.getToolConfig({ toolName: toolName! }),
    enabled: !!toolName,
  });
}
