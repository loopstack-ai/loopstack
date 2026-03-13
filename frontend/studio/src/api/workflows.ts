import type { AxiosInstance } from 'axios';
import type { PaginatedInterface, WorkflowItemInterface } from '@loopstack/contracts/api';
import type { WorkflowInterface } from '@loopstack/contracts/types';

export function createWorkflowsApi(http: AxiosInstance) {
  return {
    getById: (params: { id: string }): Promise<WorkflowInterface> =>
      http.get<WorkflowInterface>(`/api/v1/workflows/${params.id}`).then((res) => res.data),

    getAll: (params?: {
      filter?: string;
      sortBy?: string;
      page?: number;
      limit?: number;
    }): Promise<PaginatedInterface<WorkflowItemInterface>> =>
      http.get<PaginatedInterface<WorkflowItemInterface>>('/api/v1/workflows', { params }).then((res) => res.data),

    delete: (params: { id: string }): Promise<void> =>
      http.delete<void>(`/api/v1/workflows/${params.id}`).then((res) => res.data),
  };
}
