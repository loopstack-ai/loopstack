import { useQuery } from '@tanstack/react-query';
import { useApiClient } from './useApi.ts';

export function useDashboardStats() {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: ['dashboard', 'stats', envKey],
    queryFn: () => api.dashboard.getStats(),
    enabled: true,
  });
}
