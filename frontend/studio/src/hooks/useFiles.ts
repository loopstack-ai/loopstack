import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import type { FileContentInterface, FileExplorerNodeInterface } from '@loopstack/contracts/api';
import { getFileContentCacheKey, getFileTreeCacheKey } from './query-keys';
import { useApiClient } from './useApi';

export function useFileTree(
  workflowId: string | undefined,
  fileExplorerEnabled = true,
): UseQueryResult<FileExplorerNodeInterface[], Error> {
  const { envKey, api } = useApiClient();

  return useQuery<FileExplorerNodeInterface[], Error>({
    queryKey: getFileTreeCacheKey(envKey, workflowId!),
    queryFn: () => {
      if (!workflowId) {
        throw new Error('Workflow ID is required');
      }
      return api.workflows.getFileTree({ workflowId });
    },
    enabled: !!workflowId && fileExplorerEnabled,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

export function useFileContent(
  workflowId: string | undefined,
  filePath: string | undefined,
  fileExplorerEnabled = true,
): UseQueryResult<FileContentInterface, Error> {
  const { envKey, api } = useApiClient();

  return useQuery<FileContentInterface, Error>({
    queryKey: getFileContentCacheKey(envKey, workflowId!, filePath!),
    queryFn: () => {
      if (!workflowId || !filePath) {
        throw new Error('Workflow ID and file path are required');
      }
      return api.workflows.getFileContent({ workflowId, filePath });
    },
    enabled: !!workflowId && !!filePath && fileExplorerEnabled,
  });
}
