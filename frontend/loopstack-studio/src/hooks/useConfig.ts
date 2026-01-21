import { useQuery } from '@tanstack/react-query';
import type { PipelineConfigDto } from '@loopstack/api-client';
import { useApiClient } from './useApi';

export function useWorkspaceConfig() {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: ['workspace-types', envKey],
    queryFn: () => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1ConfigApi.configControllerGetWorkspaceTypes();
    },
    select: (res) => res.data,
    enabled: true,
  });
}

export function usePipelineConfig(workspaceBlockName: string | undefined) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: ['pipeline-types', workspaceBlockName, envKey],
    queryFn: () => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1ConfigApi.configControllerGetPipelineTypesByWorkspace({
        workspaceBlockName: workspaceBlockName!,
      });
    },
    enabled: !!workspaceBlockName,
    select: (res) => res.data as PipelineConfigDto[],
  });
}
