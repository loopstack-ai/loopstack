import type {
  BatchDeleteResultInterface,
  PaginatedInterface,
  WorkspaceCreateInterface,
  WorkspaceFilterInterface,
  WorkspaceInterface,
  WorkspaceSortByInterface,
  WorkspaceUpdateInterface,
} from '@loopstack/contracts/api';
import type { HttpClient, QueryParams } from '../http.js';

export interface WorkspaceListParams {
  filter?: WorkspaceFilterInterface;
  sortBy?: WorkspaceSortByInterface[];
  page?: number;
  limit?: number;
  search?: string;
}

export function createWorkspacesResource(http: HttpClient) {
  return {
    get: (id: string): Promise<WorkspaceInterface> => http.get(`/api/v1/workspaces/${id}`),

    list: (params: WorkspaceListParams = {}): Promise<PaginatedInterface<WorkspaceInterface>> =>
      http.get('/api/v1/workspaces', params as QueryParams),

    create: (payload: WorkspaceCreateInterface): Promise<WorkspaceInterface> =>
      http.post('/api/v1/workspaces', payload),

    update: (id: string, payload: WorkspaceUpdateInterface): Promise<WorkspaceInterface> =>
      http.put(`/api/v1/workspaces/${id}`, payload),

    setFavourite: (id: string, isFavourite: boolean): Promise<WorkspaceInterface> =>
      http.patch(`/api/v1/workspaces/${id}/favourite`, { isFavourite }),

    delete: (id: string): Promise<void> => http.delete(`/api/v1/workspaces/id/${id}`),

    batchDelete: (ids: string[]): Promise<BatchDeleteResultInterface> =>
      http.delete('/api/v1/workspaces/batch', { ids }),
  };
}

export type WorkspacesResource = ReturnType<typeof createWorkspacesResource>;
