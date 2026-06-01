import { useCallback, useMemo } from 'react';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { DocumentItemInterface, TransitionPayloadInterface } from '@loopstack/contracts/types';
import { useFilterDocuments } from '@/hooks/useDocuments.ts';
import { useRunWorkflow } from '@/hooks/useProcessor.ts';
import { useWorkflow } from '@/hooks/useWorkflows.ts';
import { useLlmStreamingDocuments } from './useLlmStreamingDocuments.ts';

interface UseWorkflowDataOptions {
  workflowId: string;
  showFullMessageHistory: boolean;
}

function getLlmMessageId(item: DocumentItemInterface): string | undefined {
  const content = item.content as { id?: unknown } | undefined;
  return item.alias === 'llm_message' && typeof content?.id === 'string' ? content.id : undefined;
}

function isStreamReadyForFinal(item: DocumentItemInterface): boolean {
  return !!(item.meta as { streamReadyForFinal?: boolean } | undefined)?.streamReadyForFinal;
}

export function useWorkflowData({ workflowId, showFullMessageHistory }: UseWorkflowDataOptions) {
  const fetchWorkflow = useWorkflow(workflowId);
  const fetchDocuments = useFilterDocuments(workflowId);
  const runWorkflow = useRunWorkflow();
  const streamingDocuments = useLlmStreamingDocuments(workflowId, fetchWorkflow.data?.place);

  const filterDocuments = useCallback(
    (item: DocumentItemInterface) => {
      const meta = item.meta as { hidden?: boolean; hideAtPlaces?: string[] } | undefined;
      const ui = item.ui as { hidden?: boolean } | undefined;

      let hidden = meta?.hidden || ui?.hidden || !!meta?.hideAtPlaces?.includes(fetchWorkflow.data?.place ?? '');

      const isInternalMessage = false; //['tool'].includes(document.content.role);

      if (!showFullMessageHistory && (isInternalMessage || item.tags?.includes('internal'))) {
        hidden = true;
      }

      return !hidden;
    },
    [fetchWorkflow.data, showFullMessageHistory],
  );

  const documents: DocumentItemInterface[] = useMemo(() => {
    if (!fetchDocuments.data) {
      return streamingDocuments;
    }

    const filteredFetchedDocuments = fetchDocuments.data.filter(filterDocuments);
    const streamingByMessageId = new Map(
      streamingDocuments
        .map((item) => [getLlmMessageId(item), item] as const)
        .filter((entry): entry is [string, DocumentItemInterface] => !!entry[0]),
    );

    const fetchedDocuments = filteredFetchedDocuments.filter((item) => {
      const messageId = getLlmMessageId(item);
      const streamingDocument = messageId ? streamingByMessageId.get(messageId) : undefined;
      return !streamingDocument || isStreamReadyForFinal(streamingDocument);
    });

    const fetchedMessageIds = new Set(fetchedDocuments.map(getLlmMessageId).filter((id): id is string => !!id));
    const activeStreamingDocuments = streamingDocuments.filter((item) => {
      const messageId = getLlmMessageId(item);
      return !messageId || !fetchedMessageIds.has(messageId);
    });

    return [...fetchedDocuments, ...activeStreamingDocuments];
  }, [fetchDocuments.data, filterDocuments, streamingDocuments]);

  const handleRun = useCallback(
    (transition: string, data: Record<string, unknown> | string | undefined) => {
      runWorkflow.mutate({
        workflowId: workflowId,
        runWorkflowPayloadDto: {
          transition: {
            id: transition,
            workflowId: workflowId,
            payload: data,
          } as TransitionPayloadInterface,
        },
      });
    },
    [runWorkflow, workflowId],
  );

  const isLoading = runWorkflow.isPending || fetchWorkflow.data?.status === WorkflowState.Running;

  return {
    workflow: fetchWorkflow.data,
    workflowLoading: fetchWorkflow.isLoading,
    workflowReady: fetchWorkflow.isSuccess,
    workflowError: fetchWorkflow.data?.errorMessage,
    documents,
    documentsLoading: fetchDocuments.isLoading,
    documentsReady: fetchDocuments.isSuccess,
    documentsError: fetchDocuments.error,
    isLoading,
    handleRun,
  };
}
