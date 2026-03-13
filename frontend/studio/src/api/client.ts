import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { ApiClientEvents } from '@/events';
import { eventBus } from '@/services';

export function createAxiosClient(baseURL: string, environmentId: string): AxiosInstance {
  const instance = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status && [401, 403].includes(error.response.status)) {
        eventBus.emit(ApiClientEvents.UNAUTHORIZED, environmentId);
      }

      if (error.code === 'ERR_NETWORK') {
        console.error('Connection refused - server may be down');
        eventBus.emit(ApiClientEvents.ERR_NETWORK, environmentId);
      }

      return Promise.reject(error as Error);
    },
  );

  return instance;
}
