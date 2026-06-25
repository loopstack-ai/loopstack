import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/hooks/useApi';
import type { FileExplorerVariant } from '../api/files';
import type { FileContent, FileExplorerNode } from '../types';

export function useFileTree(
  variant: FileExplorerVariant,
  workspaceId: string | undefined,
  enabled = true,
): UseQueryResult<FileExplorerNode[], Error> {
  const { envKey, api } = useApiClient();

  return useQuery<FileExplorerNode[], Error>({
    queryKey: ['file-explorer-tree', variant, envKey, workspaceId],
    queryFn: () => api.files[variant].getTree({ workspaceId: workspaceId! }),
    enabled: !!workspaceId && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useFileContent(
  variant: FileExplorerVariant,
  workspaceId: string | undefined,
  filePath: string | undefined,
  enabled = true,
): UseQueryResult<FileContent, Error> {
  const { envKey, api } = useApiClient();

  return useQuery<FileContent, Error>({
    queryKey: ['file-explorer-content', variant, envKey, workspaceId, filePath],
    queryFn: () => api.files[variant].readFile({ workspaceId: workspaceId!, path: filePath! }),
    enabled: !!workspaceId && !!filePath && enabled,
    staleTime: 15_000,
    retry: false,
  });
}
