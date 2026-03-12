import type { AxiosInstance } from 'axios';
import type { HubLoginRequestInterface, WorkerInfoInterface } from '@loopstack/contracts/api';

export function createAuthApi(http: AxiosInstance) {
  return {
    me: () => http.get<unknown>('/api/v1/auth/me').then((res) => res.data),

    getInfo: (): Promise<WorkerInfoInterface> =>
      http.get<WorkerInfoInterface>('/api/v1/auth/worker/health').then((res) => res.data),

    hubLogin: (params: { hubLoginRequestDto: HubLoginRequestInterface }) =>
      http.post<unknown>('/api/v1/auth/oauth/hub', params.hubLoginRequestDto).then((res) => res.data),

    refresh: () => http.post<unknown>('/api/v1/auth/refresh').then((res) => res.data),

    logout: () => http.post<void>('/api/v1/auth/logout').then((res) => res.data),
  };
}
