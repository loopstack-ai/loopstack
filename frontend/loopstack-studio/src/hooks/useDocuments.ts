import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { DocumentFilterDto, DocumentSortByDto } from '@loopstack/api-client';
import { useEffect } from 'react';
import { useApiClient } from './useApi.ts';
import { eventBus } from '../services';
import { SseClientEvents } from '../events';

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
    select: (res) => res.data
  });
}

export function useFilterDocuments(workflowId: string | undefined) {
  const { envKey, api } = useApiClient();

  const requestParams = {
    filter: JSON.stringify({
      workflowId: workflowId,
      isInvalidated: false
    } as DocumentFilterDto),
    sortBy: JSON.stringify([
      {
        field: 'index',
        order: 'ASC'
      } as DocumentSortByDto
    ])
  };

  return useQuery<any>({
    queryKey: ['documents', workflowId, envKey],
    queryFn: () => {
      if (!api) {
        throw new Error('API not available');
      }
      return api.ApiV1DocumentsApi.documentControllerGetDocuments(requestParams);
    },
    enabled: !!workflowId,
    select: (res) => res.data.data
  });
}

export function useDocumentsInvalidationEvents(envKey: string | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (envKey) {
      const unsubCreatedSubscriber = eventBus.on(
        SseClientEvents.DOCUMENT_CREATED,
        (payload: any) => {
          if (payload.workflowId) {
            queryClient.invalidateQueries({ queryKey: ['documents', payload.workflowId, envKey] });
          }
        }
      );

      return () => {
        unsubCreatedSubscriber();
      };
    }
  }, [queryClient]);
}
