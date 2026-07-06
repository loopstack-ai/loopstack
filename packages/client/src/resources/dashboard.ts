import type { DashboardStatsInterface } from '@loopstack/contracts/api';
import type { HttpClient } from '../http.js';

export function createDashboardResource(http: HttpClient) {
  return {
    stats: (): Promise<DashboardStatsInterface> => http.get('/api/v1/dashboard'),
  };
}

export type DashboardResource = ReturnType<typeof createDashboardResource>;
