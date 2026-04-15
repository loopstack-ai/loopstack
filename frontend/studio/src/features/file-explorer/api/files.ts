import type { AxiosInstance } from 'axios';
import type { FileContent, FileExplorerNode } from '../types';

export function createFilesApi(http: AxiosInstance) {
  return {
    getTree: (params: { workspaceId: string; path?: string }): Promise<FileExplorerNode[]> =>
      http
        .get<FileExplorerNode[]>(`/api/v1/workspaces/${params.workspaceId}/files/tree`, {
          params: params.path ? { path: params.path } : undefined,
        })
        .then((res) => res.data),

    readFile: (params: { workspaceId: string; path: string }): Promise<FileContent> =>
      http
        .get<FileContent>(`/api/v1/workspaces/${params.workspaceId}/files/read`, {
          params: { path: params.path },
        })
        .then((res) => res.data),
  };
}
