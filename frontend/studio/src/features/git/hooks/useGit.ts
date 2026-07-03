import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryKeys } from '@loopstack/client';
import { useLoopstackClient } from '@loopstack/react';
import type { GitLogResponse, GitRemoteResponse, GitStatusResponse } from '../types';

const gitPath = (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/git`;

export function useGitStatus(workspaceId: string | undefined) {
  const client = useLoopstackClient();
  return useQuery({
    queryKey: queryKeys.gitStatus(client.envKey, workspaceId!),
    queryFn: () => client.http.get<GitStatusResponse>(`${gitPath(workspaceId!)}/status`),
    enabled: !!workspaceId,
    staleTime: 30_000,
    retry: false,
  });
}

export function useGitLog(workspaceId: string | undefined, limit = 50) {
  const client = useLoopstackClient();
  return useQuery({
    queryKey: queryKeys.gitLog(client.envKey, workspaceId!),
    queryFn: () => client.http.get<GitLogResponse>(`${gitPath(workspaceId!)}/log`, { limit }),
    enabled: !!workspaceId,
    staleTime: 30_000,
    retry: false,
  });
}

export function useGitRemote(workspaceId: string | undefined) {
  const client = useLoopstackClient();
  return useQuery({
    queryKey: queryKeys.gitRemote(client.envKey, workspaceId!),
    queryFn: () => client.http.get<GitRemoteResponse | null>(`${gitPath(workspaceId!)}/remote`),
    enabled: !!workspaceId,
    staleTime: 60_000,
    retry: false,
  });
}

/**
 * Subscribes to git.updated SSE events and invalidates all git caches
 * for the given workspace. Call this once in the git panel component.
 */
export function useGitInvalidation(workspaceId: string | undefined) {
  const client = useLoopstackClient();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return;

    return client.stream.on('git.updated', (payload) => {
      if (payload.workspaceId === workspaceId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.gitStatus(client.envKey, workspaceId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.gitLog(client.envKey, workspaceId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.gitRemote(client.envKey, workspaceId) });
      }
    });
  }, [client, workspaceId, queryClient]);
}

export function useRemoveGitRemote() {
  const client = useLoopstackClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { workspaceId: string }) =>
      client.http.delete<{ success: boolean }>(`${gitPath(params.workspaceId)}/remote`),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gitRemote(client.envKey, variables.workspaceId) });
    },
  });
}
