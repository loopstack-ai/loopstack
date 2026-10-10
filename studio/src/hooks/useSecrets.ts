import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@loopstack/client';
import { useLoopstackClient } from '@loopstack/react';

/** Wire shape of a secret — the value itself never leaves the server. */
export interface SecretItem {
  id: string;
  key: string;
  hasValue: boolean;
}

const secretsPath = (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/secrets`;

export function useWorkspaceSecrets(workspaceId: string | undefined) {
  const client = useLoopstackClient();

  return useQuery({
    queryKey: queryKeys.secrets(client.envKey, workspaceId!),
    queryFn: () => client.http.get<SecretItem[]>(secretsPath(workspaceId!)),
    enabled: !!workspaceId,
  });
}

/**
 * Applies a mutation response to the cached list immediately — no stale reads
 * between the write and the SSE-driven invalidation.
 */
function useApplySecret() {
  const client = useLoopstackClient();
  const queryClient = useQueryClient();

  return (workspaceId: string, updated: SecretItem) => {
    queryClient.setQueryData<SecretItem[]>(queryKeys.secrets(client.envKey, workspaceId), (current) => {
      if (!current) return current;
      const index = current.findIndex((secret) => secret.id === updated.id);
      if (index === -1) return [...current, updated].sort((a, b) => a.key.localeCompare(b.key));
      const next = [...current];
      next[index] = updated;
      return next;
    });
  };
}

export function useCreateSecret() {
  const client = useLoopstackClient();
  const applySecret = useApplySecret();

  return useMutation({
    mutationFn: (params: { workspaceId: string; key: string; value: string }) =>
      client.http.post<SecretItem>(secretsPath(params.workspaceId), { key: params.key, value: params.value }),
    onSuccess: (secret, params) => applySecret(params.workspaceId, secret),
  });
}

export function useUpsertSecret() {
  const client = useLoopstackClient();
  const applySecret = useApplySecret();

  return useMutation({
    mutationFn: (params: { workspaceId: string; key: string; value: string }) =>
      client.http.put<SecretItem>(`${secretsPath(params.workspaceId)}/upsert`, {
        key: params.key,
        value: params.value,
      }),
    onSuccess: (secret, params) => applySecret(params.workspaceId, secret),
  });
}

export function useUpdateSecret() {
  const client = useLoopstackClient();
  const applySecret = useApplySecret();

  return useMutation({
    mutationFn: (params: { workspaceId: string; id: string; value?: string }) =>
      client.http.put<SecretItem>(`${secretsPath(params.workspaceId)}/${params.id}`, { value: params.value }),
    onSuccess: (secret, params) => applySecret(params.workspaceId, secret),
  });
}

export function useDeleteSecret() {
  const client = useLoopstackClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { workspaceId: string; id: string }) =>
      client.http.delete<{ success: boolean }>(`${secretsPath(params.workspaceId)}/${params.id}`),
    onSuccess: (_, params) => {
      queryClient.setQueryData<SecretItem[]>(queryKeys.secrets(client.envKey, params.workspaceId), (current) =>
        current?.filter((secret) => secret.id !== params.id),
      );
    },
  });
}
