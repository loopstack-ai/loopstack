import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { useLoopstackClient } from '@loopstack/react';
import type { FileContent, FileExplorerNode } from '../types';

export type FileExplorerVariant = 'local' | 'remote';

const VARIANT_BASE_PATH: Record<FileExplorerVariant, string> = {
  local: 'local-files',
  remote: 'remote-files',
};

const explorerPath = (variant: FileExplorerVariant, workspaceId: string) =>
  `/api/v1/workspaces/${workspaceId}/${VARIANT_BASE_PATH[variant]}`;

export function fileTreeKey(envKey: string, variant?: FileExplorerVariant, workspaceId?: string) {
  return ['file-explorer-tree', envKey, ...(variant ? [variant] : []), ...(workspaceId ? [workspaceId] : [])];
}

export function useFileTree(
  variant: FileExplorerVariant,
  workspaceId: string | undefined,
  enabled = true,
): UseQueryResult<FileExplorerNode[], Error> {
  const client = useLoopstackClient();

  return useQuery<FileExplorerNode[], Error>({
    queryKey: fileTreeKey(client.envKey, variant, workspaceId),
    queryFn: () => client.http.get<FileExplorerNode[]>(`${explorerPath(variant, workspaceId!)}/tree`),
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
  const client = useLoopstackClient();

  return useQuery<FileContent, Error>({
    queryKey: ['file-explorer-content', client.envKey, variant, workspaceId, filePath],
    queryFn: () => client.http.get<FileContent>(`${explorerPath(variant, workspaceId!)}/read`, { path: filePath! }),
    enabled: !!workspaceId && !!filePath && enabled,
    staleTime: 15_000,
    retry: false,
  });
}
