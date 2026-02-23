import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';
import type { FileContentDto, FileExplorerNodeDto } from '@loopstack/api-client';
import { useApiClient } from './useApi';

export function useFileTree(
  pipelineId: string | undefined,
  fileExplorerEnabled = true,
): UseQueryResult<FileExplorerNodeDto[], Error> {
  const { envKey, api } = useApiClient();

  return useQuery<AxiosResponse<FileExplorerNodeDto[]>, Error, FileExplorerNodeDto[]>({
    queryKey: ['fileTree', pipelineId, envKey],
    queryFn: () => {
      if (!api) {
        throw new Error('API not available');
      }
      if (!pipelineId) {
        throw new Error('Pipeline ID is required');
      }
      return api.ApiV1PipelinesApi.fileControllerGetFileTree({ pipelineId });
    },
    enabled: !!pipelineId && fileExplorerEnabled,
    select: (res) => res.data,
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
): UseQueryResult<FileContentDto, Error> {
  const { envKey, api } = useApiClient();

  return useQuery<AxiosResponse<FileContentDto>, Error, FileContentDto>({
    queryKey: ['fileContent', pipelineId, filePath, envKey],
    queryFn: () => {
      if (!api) {
        throw new Error('API not available');
      }
      if (!pipelineId || !filePath) {
        throw new Error('Pipeline ID and file path are required');
      }
      return api.ApiV1PipelinesApi.fileControllerGetFileContent({
        pipelineId,
        filePath,
      });
    },
    enabled: !!pipelineId && !!filePath && fileExplorerEnabled,
    select: (res) => res.data,
  });
}
