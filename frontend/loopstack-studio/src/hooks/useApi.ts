import { useMemo } from 'react';
import axios from 'axios';
import {
  ApiV1AuthApi,
  ApiV1ConfigApi,
  ApiV1DashboardApi,
  ApiV1DocumentsApi,
  ApiV1NamespacesApi,
  ApiV1PipelinesApi,
  ApiV1ProcessorApi,
  ApiV1WorkflowsApi,
  ApiV1WorkspacesApi,
  Configuration,
} from '@loopstack/api-client';
import { ApiClientEvents } from '@/events';
import { eventBus } from '@/services';
import { useStudio } from '../providers/StudioProvider';

export function useApiClient() {
  const { environment } = useStudio();

  return useMemo(() => {
    const url = environment.url;

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
      (error) => {
        if ([401, 403].includes(error.response?.status)) {
          eventBus.emit(ApiClientEvents.UNAUTHORIZED, environment.id);
        }

        if (error.code === 'ERR_NETWORK') {
          console.error('Connection refused - server may be down');
          eventBus.emit(ApiClientEvents.ERR_NETWORK, environment.id);
        }

        return Promise.reject(error);
      },
    );

    const api = {
      ApiV1AuthApi: new ApiV1AuthApi(apiConfig, url, axiosInstance),
      ApiV1DashboardApi: new ApiV1DashboardApi(apiConfig, url, axiosInstance),
      ApiV1ConfigApi: new ApiV1ConfigApi(apiConfig, url, axiosInstance),
      ApiV1DocumentsApi: new ApiV1DocumentsApi(apiConfig, url, axiosInstance),
      ApiV1NamespacesApi: new ApiV1NamespacesApi(apiConfig, url, axiosInstance),
      ApiV1PipelinesApi: new ApiV1PipelinesApi(apiConfig, url, axiosInstance),
      ApiV1ProcessorApi: new ApiV1ProcessorApi(apiConfig, url, axiosInstance),
      ApiV1WorkflowsApi: new ApiV1WorkflowsApi(apiConfig, url, axiosInstance),
      ApiV1WorkspacesApi: new ApiV1WorkspacesApi(apiConfig, url, axiosInstance),
    };

    return {
      envKey: environment.id,
      api,
    };
  }, [environment.id, environment.url]);
}
