import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { WorkspaceEnvironmentInterface } from '@loopstack/contracts/api';
import { useLoopstackClient } from '@loopstack/react';

const environmentsPath = (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/environments`;

export function useWorkspaceEnvironments(workspaceId?: string) {
  const client = useLoopstackClient();

  return useQuery({
    queryKey: ['workspace-environments', client.envKey, workspaceId],
    queryFn: () => client.http.get<WorkspaceEnvironmentInterface[]>(environmentsPath(workspaceId!)),
    enabled: !!workspaceId,
  });
}

export function useReplaceEnvironments() {
  const client = useLoopstackClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { workspaceId: string; environments: WorkspaceEnvironmentInterface[] }) =>
      client.http.put<WorkspaceEnvironmentInterface[]>(environmentsPath(params.workspaceId), params.environments),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['workspace-environments', client.envKey, variables.workspaceId],
      });
    },
  });
}

export function useResetEnvironment() {
  const client = useLoopstackClient();

  return useMutation({
    mutationFn: (params: { workspaceId: string; slotId: string }) =>
      client.http.post<{ success: boolean; message: string }>(
        `${environmentsPath(params.workspaceId)}/${params.slotId}/reset`,
      ),
  });
}
