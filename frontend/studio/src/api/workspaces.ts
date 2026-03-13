import type { AxiosInstance } from 'axios';
import type {
  PaginatedInterface,
  WorkspaceCreateInterface,
  WorkspaceFavouriteInterface,
  WorkspaceInterface,
  WorkspaceItemInterface,
  WorkspaceUpdateInterface,
} from '@loopstack/contracts/api';

export function createWorkspacesApi(http: AxiosInstance) {
  return {
    getById: (params: { id: string }): Promise<WorkspaceInterface> =>
      http.get<WorkspaceInterface>(`/api/v1/workspaces/${params.id}`).then((res) => res.data),

    getAll: (params?: {
      filter?: string;
      sortBy?: string;
      page?: number;
      limit?: number;
      search?: string;
      searchColumns?: string;
    }): Promise<PaginatedInterface<WorkspaceItemInterface>> =>
      http.get<PaginatedInterface<WorkspaceItemInterface>>('/api/v1/workspaces', { params }).then((res) => res.data),

    create: (params: { workspaceCreateDto: WorkspaceCreateInterface }): Promise<WorkspaceInterface> =>
      http.post<WorkspaceInterface>('/api/v1/workspaces', params.workspaceCreateDto).then((res) => res.data),

    update: (params: { id: string; workspaceUpdateDto: WorkspaceUpdateInterface }): Promise<WorkspaceInterface> =>
      http
        .put<WorkspaceInterface>(`/api/v1/workspaces/${params.id}`, params.workspaceUpdateDto)
        .then((res) => res.data),

    delete: (params: { id: string }): Promise<void> =>
      http.delete<void>(`/api/v1/workspaces/id/${params.id}`).then((res) => res.data),

    batchDelete: (params: { ids: string[] }): Promise<void> =>
      http.delete<void>('/api/v1/workspaces/batch', { data: { ids: params.ids } }).then((res) => res.data),

    setFavourite: (params: { id: string; workspaceFavouriteDto: WorkspaceFavouriteInterface }): Promise<void> =>
      http
        .patch<void>(`/api/v1/workspaces/${params.id}/favourite`, params.workspaceFavouriteDto)
        .then((res) => res.data),
  };
}
