import type { AxiosInstance } from 'axios';
import type { PaginatedInterface } from '@loopstack/contracts/api';
import type { DocumentItemInterface } from '@loopstack/contracts/types';

export function createDocumentsApi(http: AxiosInstance) {
  return {
    getById: (params: { id: string }): Promise<DocumentItemInterface> =>
      http.get<DocumentItemInterface>(`/api/v1/documents/${params.id}`).then((res) => res.data),

    getAll: (params?: {
      filter?: string;
      sortBy?: string;
      page?: number;
      limit?: number;
    }): Promise<PaginatedInterface<DocumentItemInterface>> =>
      http.get<PaginatedInterface<DocumentItemInterface>>('/api/v1/documents', { params }).then((res) => res.data),
  };
}
