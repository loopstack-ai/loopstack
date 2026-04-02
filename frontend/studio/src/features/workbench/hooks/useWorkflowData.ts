import { useCallback, useMemo } from 'react';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { DocumentItemInterface, TransitionPayloadInterface } from '@loopstack/contracts/types';
import { useFilterDocuments } from '@/hooks/useDocuments.ts';
import { useRunWorkflow } from '@/hooks/useProcessor.ts';
import { useWorkflow } from '@/hooks/useWorkflows.ts';

interface UseWorkflowDataOptions {
  workflowId: string;
  showFullMessageHistory: boolean;
}

export function useWorkflowData({ workflowId, showFullMessageHistory }: UseWorkflowDataOptions) {
  const fetchWorkflow = useWorkflow(workflowId);
  const fetchDocuments = useFilterDocuments(workflowId);
  const runWorkflow = useRunWorkflow();

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
      return [];
    }

    return fetchDocuments.data.filter(filterDocuments);
  }, [fetchDocuments.data, filterDocuments]);

  const handleRun = useCallback(
    (transition: string, data: Record<string, unknown> | string | undefined) => {
      runWorkflow.mutate({
        workflowId: fetchWorkflow.data!.parentId ?? fetchWorkflow.data!.id,
        runWorkflowPayloadDto: {
          transition: {
            id: transition,
            workflowId: workflowId,
            payload: data,
          } as TransitionPayloadInterface,
        },
      });
    },
    [runWorkflow, fetchWorkflow.data, workflowId],
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
