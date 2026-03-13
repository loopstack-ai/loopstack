import { useQuery } from '@tanstack/react-query';
import { getAvailableEnvironmentsCacheKey, getPipelineTypesCacheKey, getWorkspaceTypesCacheKey } from './query-keys';
import { useApiClient } from './useApi';

export function useWorkspaceConfig() {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: getWorkspaceTypesCacheKey(envKey),
    queryFn: () => api.config.getWorkspaceTypes(),
  });
}

export function usePipelineConfig(workspaceBlockName: string | undefined) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: getPipelineTypesCacheKey(envKey, workspaceBlockName!),
    queryFn: () =>
      api.config.getPipelineTypesByWorkspace({
        workspaceBlockName: workspaceBlockName!,
      }),
    enabled: !!workspaceBlockName,
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
