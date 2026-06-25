import { useMutation, useQuery } from '@tanstack/react-query';
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
  const { api } = useApiClient();

  return useMutation({
    mutationFn: (params: { workspaceId: string; key: string; value: string }) => api.secrets.create(params),
  });
}

export function useUpdateSecret() {
  const { api } = useApiClient();

  return useMutation({
    mutationFn: (params: { workspaceId: string; id: string; value?: string }) => api.secrets.update(params),
  });
}

export function useUpsertSecret() {
  const { api } = useApiClient();

  return useMutation({
    mutationFn: (params: { workspaceId: string; key: string; value: string }) => api.secrets.upsert(params),
  });
}

export function useDeleteSecret() {
  const { api } = useApiClient();

  return useMutation({
    mutationFn: (params: { workspaceId: string; id: string }) => api.secrets.delete(params),
  });
}
