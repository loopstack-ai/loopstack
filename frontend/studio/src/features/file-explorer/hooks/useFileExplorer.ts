import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/hooks/useApi';
import type { FileContent, FileExplorerNode } from '../types';

export function useFileTree(
  workspaceId: string | undefined,
  enabled = true,
): UseQueryResult<FileExplorerNode[], Error> {
  const { envKey, api } = useApiClient();

  return useQuery<FileExplorerNode[], Error>({
    queryKey: ['file-explorer-tree', envKey, workspaceId],
    queryFn: () => api.files.getTree({ workspaceId: workspaceId! }),
    enabled: !!workspaceId && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useFileContent(
  workspaceId: string | undefined,
  filePath: string | undefined,
  enabled = true,
): UseQueryResult<FileContent, Error> {
  const { envKey, api } = useApiClient();

  return useQuery<FileContent, Error>({
    queryKey: ['file-explorer-content', envKey, workspaceId, filePath],
    queryFn: () => api.files.readFile({ workspaceId: workspaceId!, path: filePath! }),
    enabled: !!workspaceId && !!filePath && enabled,
    staleTime: 15_000,
    retry: false,
  });
}
