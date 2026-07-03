import type {
  DocumentFilterInterface,
  DocumentItemInterface,
  DocumentSortByInterface,
  PaginatedInterface,
} from '@loopstack/contracts/api';
import type { HttpClient, QueryParams } from '../http.js';

export interface DocumentListParams {
  filter?: DocumentFilterInterface;
  sortBy?: DocumentSortByInterface[];
  page?: number;
  limit?: number;
}

export function createDocumentsResource(http: HttpClient) {
  return {
    get: (id: string): Promise<DocumentItemInterface> => http.get(`/api/v1/documents/${id}`),

    list: (params: DocumentListParams = {}): Promise<PaginatedInterface<DocumentItemInterface>> =>
      http.get('/api/v1/documents', params as QueryParams),
  };
}

export type DocumentsResource = ReturnType<typeof createDocumentsResource>;
