import { useQuery } from '@tanstack/react-query';
import { useApiClient } from './useApi.ts';

export function useDashboardStats() {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: ['dashboard', 'stats', envKey],
    queryFn: async () => {
      if (!api) {
        throw new Error('API not available');
      }
      const res = await api.ApiV1DashboardApi.dashboardControllerGetDashboardStats();
      return res.data;
    },
    enabled: true
  });
}
