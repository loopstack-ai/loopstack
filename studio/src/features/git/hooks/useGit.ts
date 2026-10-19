import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryKeys } from '@loopstack/client';
import { useLoopstackClient } from '@loopstack/react';
import type { GitLogResponse, GitRemoteResponse, GitReposResponse, GitStatusResponse } from '../types';

const gitPath = (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/git`;

/** The query params every git read takes: which environment slot, and which repository of the workspace. */
const gitParams = (slotId?: string, dir?: string) => ({
  ...(slotId ? { slotId } : {}),
  ...(dir ? { dir } : {}),
});

/**
 * The repositories the workspace holds. Unlike the reads below it needs no running container — the list is
 * what the workspace was created with — so it loads whether or not an environment is up.
 */
export function useGitRepos(workspaceId: string | undefined) {
  const client = useLoopstackClient();
  return useQuery({
    queryKey: queryKeys.gitRepos(client.envKey, workspaceId!),
    queryFn: () => client.http.get<GitReposResponse>(`${gitPath(workspaceId!)}/repos`),
    enabled: !!workspaceId,
    staleTime: 60_000,
    retry: false,
  });
}

export function useGitStatus(workspaceId: string | undefined, slotId?: string, dir?: string, enabled = true) {
  const client = useLoopstackClient();
  return useQuery({
    queryKey: [...queryKeys.gitStatus(client.envKey, workspaceId!), slotId ?? '', dir ?? ''],
    queryFn: () => client.http.get<GitStatusResponse>(`${gitPath(workspaceId!)}/status`, gitParams(slotId, dir)),
    enabled: !!workspaceId && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useGitLog(workspaceId: string | undefined, limit = 50, slotId?: string, dir?: string, enabled = true) {
  const client = useLoopstackClient();
  return useQuery({
    queryKey: [...queryKeys.gitLog(client.envKey, workspaceId!), slotId ?? '', dir ?? ''],
    queryFn: () =>
      client.http.get<GitLogResponse>(`${gitPath(workspaceId!)}/log`, { limit, ...gitParams(slotId, dir) }),
    enabled: !!workspaceId && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useGitRemote(workspaceId: string | undefined, slotId?: string, dir?: string, enabled = true) {
  const client = useLoopstackClient();
  return useQuery({
    queryKey: [...queryKeys.gitRemote(client.envKey, workspaceId!), slotId ?? '', dir ?? ''],
    queryFn: () => client.http.get<GitRemoteResponse | null>(`${gitPath(workspaceId!)}/remote`, gitParams(slotId, dir)),
    enabled: !!workspaceId && enabled,
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
        void queryClient.invalidateQueries({ queryKey: queryKeys.gitRepos(client.envKey, workspaceId) });
      }
    });
  }, [client, workspaceId, queryClient]);
}

export function useRemoveGitRemote() {
  const client = useLoopstackClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { workspaceId: string; dir?: string }) =>
      client.http.delete<{ success: boolean }>(
        // A delete carries a body rather than params, so the repository goes in the query string.
        `${gitPath(params.workspaceId)}/remote${params.dir ? `?dir=${encodeURIComponent(params.dir)}` : ''}`,
      ),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gitRemote(client.envKey, variables.workspaceId) });
    },
  });
}
