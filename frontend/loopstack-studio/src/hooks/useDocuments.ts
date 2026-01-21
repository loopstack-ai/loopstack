import { useQuery } from '@tanstack/react-query';
import type { DocumentFilterDto, DocumentSortByDto } from '@loopstack/api-client';
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
    queryFn: () => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1DocumentsApi.documentControllerGetDocumentById({ id });
    },
    enabled: !!id,
    select: (res) => res.data,
  });
}

export function useFilterDocuments(workflowId: string | undefined) {
  const { envKey, api } = useApiClient();

  const requestParams = {
    filter: JSON.stringify({
      workflowId: workflowId,
      isInvalidated: false,
    } as DocumentFilterDto),
    sortBy: JSON.stringify([
      {
        field: 'index',
        order: 'ASC',
      } as DocumentSortByDto,
    ]),
  };

  return useQuery<any>({
    queryKey: getDocumentsCacheKey(envKey, workflowId!),
    queryFn: () => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1DocumentsApi.documentControllerGetDocuments(requestParams);
    },
    enabled: !!workflowId,
    select: (res) => res.data.data,
  });
}
