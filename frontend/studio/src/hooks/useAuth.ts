import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { HubLoginRequestInterface } from '@loopstack/contracts/api';
import { useApiClient } from './useApi.ts';

export function useMe(enabled = true) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: ['me', envKey],
    queryFn: () => api.auth.me(),
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: enabled,
  });
}

export function useGetHealthInfo(enabled = true) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: ['health', envKey],
    queryFn: () => api.auth.getInfo(),
    staleTime: 5 * 60 * 1000,
    enabled: enabled,
  });
}

export function useWorkerAuth() {
  const { api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { hubLoginRequestDto: HubLoginRequestInterface }) => api.auth.hubLogin(params),
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });
}

export function useWorkerAuthTokenRefresh() {
  const { api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.auth.refresh(),
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });
}
