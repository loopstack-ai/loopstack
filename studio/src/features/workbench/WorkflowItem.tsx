import { AlertCircle, ChevronUp, RefreshCw } from 'lucide-react';
import React, { useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { WorkflowFullInterface } from '@loopstack/contracts/api';
import { WorkflowState } from '@loopstack/contracts/enums';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import LoadingCentered from '@/components/feedback/LoadingCentered';
import { Button } from '@/components/ui/button.tsx';
import { DocumentList } from '@/features/documents';
import WorkflowForms from '@/features/workbench/components/WorkflowForms.tsx';
import { useRunWorkflow } from '@/hooks/useProcessor.ts';
import { cn } from '@/lib/utils';
import type { WorkbenchSettingsInterface } from './WorkflowList.tsx';
import { useWorkflowData } from './hooks/useWorkflowData.ts';

const WorkflowItem: React.FC<{
  workflow: WorkflowFullInterface;
  workflowId: string;
  scrollTo: (workflowId: string) => void;
  settings: WorkbenchSettingsInterface;
  embed?: boolean;
}> = ({ workflow, workflowId, scrollTo, settings, embed }) => {
  const { workflowId: paramsWorkflowId, clickId } = useParams();
  const runWorkflow = useRunWorkflow();

  const {
    workflow: childWorkflow,
    workflowLoading,
    workflowReady,
    workflowError,
    documents,
    hasOlderDocuments,
    loadOlderDocuments,
    isLoadingOlderDocuments,
    documentsLoading,
    documentsReady,
    documentsError,
    isLoading,
    handleRun,
  } = useWorkflowData({ workflowId, showFullMessageHistory: settings.showFullMessageHistory });

  // auto scroll to the item on a navigation event (clickId) but only after element is fully loaded
  useEffect(() => {
    if (paramsWorkflowId === workflowId && workflowReady && documentsReady) {
      scrollTo(workflowId);
    }
  }, [workflowReady, documentsReady, workflowId, paramsWorkflowId, clickId, scrollTo]);

  // Retry: enabled only when failed with auto-transitions available (not during auto-retry or at custom error place)
  const hasAutoTransition = childWorkflow?.availableTransitions?.some(
    (t) => (t as { trigger?: string }).trigger !== 'manual',
  );
  const isAutoRetrying = childWorkflow?.hasError && childWorkflow.status === WorkflowState.Waiting;
  const canRetry = childWorkflow?.hasError && !isAutoRetrying && hasAutoTransition !== false;

  const handleRetry = () => {
    runWorkflow.mutate({ workflowId: workflowId });
  };

  // Prepending older messages grows the page upwards, which would scroll the read position away. Measuring
  // from the bottom (stable across the insert) and restoring it after paint keeps the same messages in view.
  const handleLoadOlder = useCallback(async () => {
    const distanceFromBottom = document.documentElement.scrollHeight - document.documentElement.scrollTop;
    await loadOlderDocuments();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => window.scrollTo({ top: document.documentElement.scrollHeight - distanceFromBottom })),
    );
  }, [loadOlderDocuments]);

  return (
    <div className={cn('flex flex-col', embed ? 'p-0' : 'p-4')}>
      <LoadingCentered loading={workflowLoading || documentsLoading} />
      <ErrorSnackbar error={documentsError} />

      {workflowReady && childWorkflow && hasOlderDocuments && (
        <div className="mb-3 flex justify-center">
          <Button variant="outline" size="sm" disabled={isLoadingOlderDocuments} onClick={() => void handleLoadOlder()}>
            {isLoadingOlderDocuments ? (
              <div className="mr-1 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <ChevronUp className="mr-1 h-3.5 w-3.5" />
            )}
            Load older messages
          </Button>
        </div>
      )}

      {workflowReady && childWorkflow && (
        <DocumentList
          workflow={workflow}
          childWorkflow={childWorkflow}
          documents={documents}
          scrollTo={scrollTo}
          settings={settings}
        />
      )}

      <LoadingCentered loading={isLoading} />

      {workflowError && childWorkflow?.hasError && (
        <div className="mt-3 flex items-center gap-2 px-1">
          <AlertCircle className="text-destructive h-4 w-4 shrink-0" />
          <span className="text-destructive flex-1 text-sm">{workflowError}</span>
          {canRetry && (
            <Button variant="outline" size="sm" disabled={runWorkflow.isPending} onClick={handleRetry}>
              {runWorkflow.isPending ? (
                <div className="mr-1 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
              )}
              Retry
            </Button>
          )}
        </div>
      )}

      {!!childWorkflow && (
        <div className="mt-6">
          <WorkflowForms
            workflow={childWorkflow}
            parentWorkflow={workflow}
            isLoading={isLoading}
            onSubmit={handleRun}
          />
        </div>
      )}
    </div>
  );
};

export default WorkflowItem;
