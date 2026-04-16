import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getGitLogCacheKey, getGitRemoteCacheKey, getGitStatusCacheKey } from '@/hooks/query-keys';
import { useApiClient } from '@/hooks/useApi';
import { eventBus } from '@/services';

export function useGitStatus(workspaceId: string | undefined) {
  const { envKey, api } = useApiClient();
  return useQuery({
    queryKey: getGitStatusCacheKey(envKey, workspaceId!),
    queryFn: () => api.git.getStatus({ workspaceId: workspaceId! }),
    enabled: !!workspaceId,
    staleTime: 30_000,
    retry: false,
  });
}

export function useGitLog(workspaceId: string | undefined, limit = 50) {
  const { envKey, api } = useApiClient();
  return useQuery({
    queryKey: getGitLogCacheKey(envKey, workspaceId!),
    queryFn: () => api.git.getLog({ workspaceId: workspaceId!, limit }),
    enabled: !!workspaceId,
    staleTime: 30_000,
    retry: false,
  });
}

export function useGitRemote(workspaceId: string | undefined) {
  const { envKey, api } = useApiClient();
  return useQuery({
    queryKey: getGitRemoteCacheKey(envKey, workspaceId!),
    queryFn: () => api.git.getRemote({ workspaceId: workspaceId! }),
    enabled: !!workspaceId,
    staleTime: 60_000,
    retry: false,
  });
}

/**
 * Subscribes to workspace.updated SSE events and invalidates all git caches
 * for the given workspace. Call this once in the git panel component.
 */
export function useGitInvalidation(workspaceId: string | undefined) {
  const { envKey } = useApiClient();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return;

    const unsub = eventBus.on('git.updated', (payload: { workspaceId?: string }) => {
      if (payload.workspaceId === workspaceId) {
        void queryClient.invalidateQueries({ queryKey: getGitStatusCacheKey(envKey, workspaceId) });
        void queryClient.invalidateQueries({ queryKey: getGitLogCacheKey(envKey, workspaceId) });
        void queryClient.invalidateQueries({ queryKey: getGitRemoteCacheKey(envKey, workspaceId) });
      }
    });

    return unsub;
  }, [envKey, workspaceId, queryClient]);
}

export function useRemoveGitRemote() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { workspaceId: string }) => api.git.removeRemote(params),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: getGitRemoteCacheKey(envKey, variables.workspaceId) });
    },
  });
}
