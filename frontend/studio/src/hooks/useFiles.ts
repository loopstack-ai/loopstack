import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import type { FileContentInterface, FileExplorerNodeInterface } from '@loopstack/contracts/api';
import { useApiClient } from './useApi';

export function useFileTree(
  pipelineId: string | undefined,
  fileExplorerEnabled = true,
): UseQueryResult<FileExplorerNodeInterface[], Error> {
  const { envKey, api } = useApiClient();

  return useQuery<FileExplorerNodeInterface[], Error>({
    queryKey: ['fileTree', pipelineId, envKey],
    queryFn: () => {
      if (!pipelineId) {
        throw new Error('Pipeline ID is required');
      }
      return api.pipelines.getFileTree({ pipelineId });
    },
    enabled: !!pipelineId && fileExplorerEnabled,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

export function useFileContent(
  pipelineId: string | undefined,
  filePath: string | undefined,
  fileExplorerEnabled = true,
): UseQueryResult<FileContentInterface, Error> {
  const { envKey, api } = useApiClient();

  return useQuery<FileContentInterface, Error>({
    queryKey: ['fileContent', pipelineId, filePath, envKey],
    queryFn: () => {
      if (!pipelineId || !filePath) {
        throw new Error('Pipeline ID and file path are required');
      }
      return api.pipelines.getFileContent({ pipelineId, filePath });
    },
    enabled: !!pipelineId && !!filePath && fileExplorerEnabled,
  });
}
