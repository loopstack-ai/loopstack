import React, { useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { PipelineInterface } from '@loopstack/contracts/api';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import type { TransitionPayloadInterface } from '@loopstack/contracts/types';
import ErrorSnackbar from '@/components/snackbars/ErrorSnackbar.tsx';
import DocumentList from '@/features/workbench/components/DocumentList.tsx';
import WorkflowForms from '@/features/workbench/components/WorkflowForms.tsx';
import { useFilterDocuments } from '@/hooks/useDocuments.ts';
import { useRunPipeline } from '@/hooks/useProcessor.ts';
import { useWorkflow } from '@/hooks/useWorkflows.ts';
import { cn } from '@/lib/utils';
import LoadingCentered from '../../components/LoadingCentered.tsx';
import BasicErrorComponent from '../../components/content/ErrorAlert.tsx';
import type { WorkbenchSettingsInterface } from './WorkflowList.tsx';

const WorkflowItem: React.FC<{
  pipeline: PipelineInterface;
  workflowId: string;
  scrollTo: (workflowId: string) => void;
  settings: WorkbenchSettingsInterface;
  embed?: boolean;
}> = ({ pipeline, workflowId, scrollTo, settings, embed }) => {
  const { workflowId: paramsWorkflowId, clickId } = useParams();
  const fetchWorkflow = useWorkflow(workflowId);
  const fetchDocuments = useFilterDocuments(workflowId);

  // auto scroll to the item on a navigation event (clickId) but only after element is fully loaded
  useEffect(() => {
    if (paramsWorkflowId === workflowId && fetchWorkflow.isSuccess && fetchDocuments.isSuccess) {
      scrollTo(workflowId);
    }
  }, [fetchWorkflow.isSuccess, fetchDocuments.isSuccess, workflowId, paramsWorkflowId, clickId, scrollTo]);

  const filterDocuments = useCallback(
    (item: DocumentItemInterface) => {
      const meta = item.meta as { hidden?: boolean; hideAtPlaces?: string[] } | undefined;
      const ui = item.ui as { hidden?: boolean } | undefined;

      let hidden = meta?.hidden || ui?.hidden || !!meta?.hideAtPlaces?.includes(fetchWorkflow.data?.place ?? '');

      const isInternalMessage = false; //['tool'].includes(document.content.role);

      if (!settings.showFullMessageHistory && (isInternalMessage || item.tags?.includes('internal'))) {
        hidden = true;
      }

      return !hidden;
    },
    [fetchWorkflow.data, settings.showFullMessageHistory],
  );

  const documents: DocumentItemInterface[] = useMemo(() => {
    if (!fetchDocuments.data) {
      return [];
    }

    return fetchDocuments.data.filter(filterDocuments);
  }, [fetchDocuments.data, filterDocuments]);

  const runPipeline = useRunPipeline();
  const handleRun = (transition: string, data: Record<string, unknown> | string | undefined) => {
    runPipeline.mutate({
      pipelineId: fetchWorkflow.data!.pipelineId,
      runPipelinePayloadDto: {
        transition: {
          id: transition,
          workflowId: workflowId,
          payload: data,
        } as TransitionPayloadInterface,
      },
    });
  };

  const isLoading = runPipeline.isPending || fetchWorkflow.data?.status === WorkflowState.Running;

  return (
    <div className={cn('flex flex-col', embed ? 'p-0' : 'p-4')}>
      <LoadingCentered loading={fetchWorkflow.isLoading || fetchDocuments.isLoading} />
      <ErrorSnackbar error={fetchDocuments.error} />

      <BasicErrorComponent error={fetchWorkflow.data?.errorMessage} />

      {fetchWorkflow.isSuccess && (
        <DocumentList
          pipeline={pipeline}
          workflow={fetchWorkflow.data}
          documents={documents}
          scrollTo={scrollTo}
          settings={settings}
          isLoading={isLoading}
        />
      )}

      <LoadingCentered loading={isLoading} />

      {!!fetchWorkflow.data && !embed && (
        <div className="mt-6">
          <WorkflowForms workflow={fetchWorkflow.data} onSubmit={handleRun} />
        </div>
      )}
    </div>
  );
};

export default WorkflowItem;
