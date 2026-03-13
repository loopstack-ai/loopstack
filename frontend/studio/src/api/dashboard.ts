import type { AxiosInstance } from 'axios';
import type { DashboardStatsInterface } from '@loopstack/contracts/api';

export function createDashboardApi(http: AxiosInstance) {
  return {
    getStats: (): Promise<DashboardStatsInterface> =>
      http.get<DashboardStatsInterface>('/api/v1/dashboard').then((res) => res.data),
  };
}
