import type { AxiosInstance } from 'axios';
import type {
  FileContentInterface,
  FileExplorerNodeInterface,
  PaginatedInterface,
  WorkflowCreateInterface,
  WorkflowFullInterface,
  WorkflowItemInterface,
  WorkflowUpdateInterface,
} from '@loopstack/contracts/api';

export function createWorkflowsApi(http: AxiosInstance) {
  return {
    getById: (params: { id: string }): Promise<WorkflowFullInterface> =>
      http.get<WorkflowFullInterface>(`/api/v1/workflows/${params.id}`).then((res) => res.data),

    getAll: (params?: {
      filter?: string;
      sortBy?: string;
      page?: number;
      limit?: number;
      search?: string;
      searchColumns?: string;
    }): Promise<PaginatedInterface<WorkflowItemInterface>> =>
      http.get<PaginatedInterface<WorkflowItemInterface>>('/api/v1/workflows', { params }).then((res) => res.data),

    create: (params: { workflowCreateDto: WorkflowCreateInterface }): Promise<WorkflowFullInterface> =>
      http.post<WorkflowFullInterface>('/api/v1/workflows', params.workflowCreateDto).then((res) => res.data),

    update: (params: { id: string; workflowUpdateDto: WorkflowUpdateInterface }): Promise<WorkflowFullInterface> =>
      http
        .put<WorkflowFullInterface>(`/api/v1/workflows/${params.id}`, params.workflowUpdateDto)
        .then((res) => res.data),

    delete: (params: { id: string }): Promise<void> =>
      http.delete<void>(`/api/v1/workflows/id/${params.id}`).then((res) => res.data),

    batchDelete: (params: { ids: string[] }): Promise<void> =>
      http.delete<void>('/api/v1/workflows/batch', { data: { ids: params.ids } }).then((res) => res.data),

    getFileTree: (params: { workflowId: string }): Promise<FileExplorerNodeInterface[]> =>
      http.get<FileExplorerNodeInterface[]>(`/api/v1/files/workflows/${params.workflowId}`).then((res) => res.data),

    getFileContent: (params: { workflowId: string; filePath: string }): Promise<FileContentInterface> =>
      http
        .get<FileContentInterface>(`/api/v1/files/workflows/${params.workflowId}/${params.filePath}`)
        .then((res) => res.data),

    getCheckpoints: (params: { id: string }): Promise<WorkflowCheckpoint[]> =>
      http.get<WorkflowCheckpoint[]>(`/api/v1/workflows/${params.id}/checkpoints`).then((res) => res.data),
  };
}

export interface WorkflowCheckpoint {
  id: string;
  place: string;
  transitionId: string | null;
  transitionFrom: string | null;
  version: number;
  createdAt: string;
}
