import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSecretsCacheKey } from './query-keys.ts';
import { useApiClient } from './useApi.ts';

export function useWorkspaceSecrets(workspaceId: string | undefined) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: getSecretsCacheKey(envKey, workspaceId!),
    queryFn: () => api.secrets.getByWorkspaceId({ workspaceId: workspaceId! }),
    enabled: !!workspaceId,
  });
}

export function useCreateSecret() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { workspaceId: string; key: string; value: string }) => api.secrets.create(params),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: getSecretsCacheKey(envKey, variables.workspaceId) });
    },
  });
}

export function useUpdateSecret() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { workspaceId: string; id: string; value?: string }) => api.secrets.update(params),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: getSecretsCacheKey(envKey, variables.workspaceId) });
    },
  });
}

export function useUpsertSecret() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { workspaceId: string; key: string; value: string }) => api.secrets.upsert(params),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: getSecretsCacheKey(envKey, variables.workspaceId) });
    },
  });
}

export function useDeleteSecret() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { workspaceId: string; id: string }) => api.secrets.delete(params),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: getSecretsCacheKey(envKey, variables.workspaceId) });
    },
  });
}
