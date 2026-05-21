import { useQuery } from '@tanstack/react-query';
import { getAppTypesCacheKey, getAvailableEnvironmentsCacheKey, getWorkflowTypesCacheKey } from './query-keys';
import { useApiClient } from './useApi';

export function useAppConfig() {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: getAppTypesCacheKey(envKey),
    queryFn: () => api.config.getAppTypes(),
  });
}

export function useWorkflowConfig(appBlockName: string | undefined) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: getWorkflowTypesCacheKey(envKey, appBlockName!),
    queryFn: () =>
      api.config.getWorkflowTypesByApp({
        appBlockName: appBlockName!,
      }),
    enabled: !!appBlockName,
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
