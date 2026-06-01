import { useQuery } from '@tanstack/react-query';
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
