import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiV1AuthApiAuthControllerHubLoginRequest } from '@loopstack/api-client';
import { useApiClient } from './useApi.ts';

export function useMe(enabled = true) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: ['me', envKey],
    queryFn: () => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1AuthApi.authControllerMe();
    },
    select: (res) => res.data,
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: enabled
  });
}

export function useGetHealthInfo(enabled = true) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: ['health', envKey],
    queryFn: () => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1AuthApi.authControllerGetInfo();
    },
    select: (res) => res.data,
    staleTime: 5 * 60 * 1000,
    enabled: enabled
  });
}

export function useWorkerAuth() {
  const { api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (hubLoginRequest: ApiV1AuthApiAuthControllerHubLoginRequest) => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1AuthApi.authControllerHubLogin(hubLoginRequest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    }
  });
}

export function useWorkerAuthTokenRefresh() {
  const { api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1AuthApi.authControllerRefresh();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    }
  });
}
