import type {
  BatchDeleteResultInterface,
  PaginatedInterface,
  WorkflowCheckpointInterface,
  WorkflowCreateInterface,
  WorkflowFilterInterface,
  WorkflowFullInterface,
  WorkflowItemInterface,
  WorkflowSortByInterface,
  WorkflowStatusInterface,
  WorkflowUpdateInterface,
} from '@loopstack/contracts/api';
import type { HttpClient, QueryParams } from '../http.js';

export interface WorkflowListParams {
  filter?: WorkflowFilterInterface;
  sortBy?: WorkflowSortByInterface[];
  /** 0-indexed page number (first page is 0). */
  page?: number;
  limit?: number;
  search?: string;
}

export function createWorkflowsResource(http: HttpClient) {
  return {
    get: (id: string): Promise<WorkflowFullInterface> => http.get(`/api/v1/workflows/${id}`),

    status: (id: string): Promise<WorkflowStatusInterface> => http.get(`/api/v1/workflows/${id}/status`),

    list: (params: WorkflowListParams = {}): Promise<PaginatedInterface<WorkflowItemInterface>> =>
      http.get('/api/v1/workflows', params as QueryParams),

    create: (payload: WorkflowCreateInterface): Promise<WorkflowFullInterface> =>
      http.post('/api/v1/workflows', payload),

    update: (id: string, payload: WorkflowUpdateInterface): Promise<WorkflowFullInterface> =>
      http.put(`/api/v1/workflows/${id}`, payload),

    delete: (id: string): Promise<void> => http.delete(`/api/v1/workflows/id/${id}`),

    batchDelete: (ids: string[]): Promise<BatchDeleteResultInterface> =>
      http.delete('/api/v1/workflows/batch', { ids }),

    checkpoints: (id: string): Promise<WorkflowCheckpointInterface[]> =>
      http.get(`/api/v1/workflows/${id}/checkpoints`),
  };
}

export type WorkflowsResource = ReturnType<typeof createWorkflowsResource>;
