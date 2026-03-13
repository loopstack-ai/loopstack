import { useQuery } from '@tanstack/react-query';
import type { DocumentFilterInterface, DocumentSortByInterface } from '@loopstack/contracts/api';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import { useApiClient } from './useApi.ts';

export function getDocumentCacheKey(envKey: string, documentId: string) {
  return ['document', envKey, documentId];
}

export function getDocumentsCacheKey(envKey: string, workflowId: string) {
  return ['documents', envKey, workflowId];
}

export function useDocument(id: string) {
  const { envKey, api } = useApiClient();

  return useQuery({
    queryKey: ['document', id, envKey],
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

  return useQuery<DocumentItemInterface[]>({
    queryKey: getDocumentsCacheKey(envKey, workflowId!),
    queryFn: () => api.documents.getAll(requestParams).then((res) => res.data),
    enabled: !!workflowId,
  });
}
