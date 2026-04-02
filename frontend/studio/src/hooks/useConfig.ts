import { useQuery } from '@tanstack/react-query';
import { getAvailableEnvironmentsCacheKey, getWorkflowTypesCacheKey, getWorkspaceTypesCacheKey } from './query-keys';
import { useApiClient } from './useApi';

export function useWorkspaceConfig() {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: getWorkspaceTypesCacheKey(envKey),
    queryFn: () => api.config.getWorkspaceTypes(),
  });
}

export function useWorkflowConfig(workspaceBlockName: string | undefined) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: getWorkflowTypesCacheKey(envKey, workspaceBlockName!),
    queryFn: () =>
      api.config.getWorkflowTypesByWorkspace({
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
