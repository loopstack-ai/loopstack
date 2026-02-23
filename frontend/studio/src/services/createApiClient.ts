import axios, { AxiosError } from 'axios';
import { ApiV1AuthApi, Configuration } from '@loopstack/api-client';
import { ApiClientEvents } from '../events/api-client-events';
import type { Environment } from '../types';
import { eventBus } from './eventEmitter';

export function createApiClient(environment: Environment) {
  const apiConfig = new Configuration({
    baseOptions: {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  });

  const axiosInstance = axios.create();
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if ([401, 403].includes(error.response?.status as number)) {
        eventBus.emit(ApiClientEvents.UNAUTHORIZED, environment.id);
      }
      if (error.code === 'ERR_NETWORK') {
        eventBus.emit(ApiClientEvents.ERR_NETWORK, environment.id);
      }
      return Promise.reject(error as Error);
    },
  );

  return {
    auth: new ApiV1AuthApi(apiConfig, environment.url, axiosInstance),
    // Add other APIs as needed
  };
}
