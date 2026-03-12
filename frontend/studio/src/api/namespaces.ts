import type { AxiosInstance } from 'axios';
import type { NamespaceInterface, NamespaceItemInterface, PaginatedInterface } from '@loopstack/contracts/api';

export function createNamespacesApi(http: AxiosInstance) {
  return {
    getById: (params: { id: string }): Promise<NamespaceInterface> =>
      http.get<NamespaceInterface>(`/api/v1/namespaces/${params.id}`).then((res) => res.data),

    getAll: (params?: {
      filter?: string;
      sortBy?: string;
      page?: number;
      limit?: number;
    }): Promise<PaginatedInterface<NamespaceItemInterface>> =>
      http.get<PaginatedInterface<NamespaceItemInterface>>('/api/v1/namespaces', { params }).then((res) => res.data),
  };
}
