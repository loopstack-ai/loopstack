import { useQuery } from '@tanstack/react-query';
import { useApiClient } from './useApi';

export function useWorkspaceConfig() {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: ['workspace-types', envKey],
    queryFn: () => api.config.getWorkspaceTypes(),
    enabled: true,
  });
}

export function usePipelineConfig(workspaceBlockName: string | undefined) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: ['pipeline-types', workspaceBlockName, envKey],
    queryFn: () =>
      api.config.getPipelineTypesByWorkspace({
        workspaceBlockName: workspaceBlockName!,
      }),
    enabled: !!workspaceBlockName,
  });
}
