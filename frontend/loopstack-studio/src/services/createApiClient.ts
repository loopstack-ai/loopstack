import { ApiV1AuthApi, Configuration } from '@loopstack/api-client';
import axios from 'axios';
import { ApiClientEvents } from '../events/api-client-events';
import type { Environment } from '../types';
import { eventBus } from './eventEmitter';

export function createApiClient(environment: Environment) {
  const apiConfig = new Configuration({
    baseOptions: {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  });

  const axiosInstance = axios.create();
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      if ([401, 403].includes(error.response?.status)) {
        eventBus.emit(ApiClientEvents.UNAUTHORIZED, environment.id);
      }
      if (error.code === 'ERR_NETWORK') {
        eventBus.emit(ApiClientEvents.ERR_NETWORK, environment.id);
      }
      return Promise.reject(error);
    }
  );

  return {
    auth: new ApiV1AuthApi(apiConfig, environment.url, axiosInstance)
    // Add other APIs as needed
  };
}
