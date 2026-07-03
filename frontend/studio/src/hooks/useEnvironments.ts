import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { WorkspaceEnvironmentInterface } from '@loopstack/contracts/api';
import { useApiClient } from './useApi.ts';

export function useWorkspaceEnvironments(workspaceId?: string) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: ['workspace-environments', envKey, workspaceId],
    queryFn: () => api.environments.getByWorkspace(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useReplaceEnvironments() {
  const { envKey, api } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { workspaceId: string; environments: WorkspaceEnvironmentInterface[] }) =>
      api.environments.replaceEnvironments(params.workspaceId, params.environments),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-environments', envKey, variables.workspaceId] });
    },
  });
}

export function useResetEnvironment() {
  const { api } = useApiClient();

  return useMutation({
    mutationFn: (params: { workspaceId: string; slotId: string }) => api.environments.resetEnvironment(params),
  });
}
