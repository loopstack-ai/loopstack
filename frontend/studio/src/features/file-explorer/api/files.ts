import type { AxiosInstance } from 'axios';
import type { FileContent, FileExplorerNode } from '../types';

export type FileExplorerVariant = 'local' | 'remote';

const VARIANT_BASE_PATH: Record<FileExplorerVariant, string> = {
  local: 'local-files',
  remote: 'remote-files',
};

export function createFilesApi(http: AxiosInstance, variant: FileExplorerVariant) {
  const basePath = VARIANT_BASE_PATH[variant];
  return {
    getTree: (params: { workspaceId: string; path?: string }): Promise<FileExplorerNode[]> =>
      http
        .get<FileExplorerNode[]>(`/api/v1/workspaces/${params.workspaceId}/${basePath}/tree`, {
          params: params.path ? { path: params.path } : undefined,
        })
        .then((res) => res.data),

    readFile: (params: { workspaceId: string; path: string }): Promise<FileContent> =>
      http
        .get<FileContent>(`/api/v1/workspaces/${params.workspaceId}/${basePath}/read`, {
          params: { path: params.path },
        })
        .then((res) => res.data),
  };
}

export type FilesApi = ReturnType<typeof createFilesApi>;
