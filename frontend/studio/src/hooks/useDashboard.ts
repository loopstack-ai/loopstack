import { useQuery } from '@tanstack/react-query';
import { getDashboardStatsCacheKey } from './query-keys.ts';
import { useApiClient } from './useApi.ts';

export function useDashboardStats() {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: getDashboardStatsCacheKey(envKey),
    queryFn: () => api.dashboard.getStats(),
  });
}
