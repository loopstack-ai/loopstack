import { useQuery } from '@tanstack/react-query';
import type { DocumentFilterInterface, DocumentSortByInterface, PaginatedInterface } from '@loopstack/contracts/api';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import { getDocumentCacheKey, getDocumentsCacheKey } from './query-keys.ts';
import { useApiClient } from './useApi.ts';

export function useDocument(id: string) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: getDocumentCacheKey(envKey, id),
    queryFn: () => api.documents.getById({ id }),
    enabled: !!id,
  });
}

export function useFilterDocuments(workflowId: string | undefined) {
  const { envKey, api } = useApiClient();

  const requestParams = {
    filter: JSON.stringify({
      workflowId: workflowId,
      isInvalidated: false,
    } as DocumentFilterInterface),
    sortBy: JSON.stringify([
      {
        field: 'index',
        order: 'ASC',
      } as DocumentSortByInterface,
    ]),
  };

  return useQuery<PaginatedInterface<DocumentItemInterface>, Error, DocumentItemInterface[]>({
    queryKey: getDocumentsCacheKey(envKey, workflowId!),
    queryFn: () => api.documents.getAll(requestParams),
    select: (res) => res.data,
    enabled: !!workflowId,
  });
}
