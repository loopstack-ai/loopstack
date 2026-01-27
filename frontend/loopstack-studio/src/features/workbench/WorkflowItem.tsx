import React, { useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { DocumentItemDto, PipelineDto } from '@loopstack/api-client';
import type { TransitionPayloadInterface } from '@loopstack/contracts/types';
import ErrorSnackbar from '@/components/snackbars/ErrorSnackbar.tsx';
import DocumentList from '@/features/workbench/components/DocumentList.tsx';
import WorkflowForms from '@/features/workbench/components/WorkflowForms.tsx';
import { useFilterDocuments } from '@/hooks/useDocuments.ts';
import { useRunPipeline } from '@/hooks/useProcessor.ts';
import { useWorkflow } from '@/hooks/useWorkflows.ts';
import LoadingCentered from '../../components/LoadingCentered.tsx';
import BasicErrorComponent from '../../components/content/errorAlert.tsx';
import type { WorkbenchSettingsInterface } from './WorkflowList.tsx';
import WorkflowButtons from './components/buttons/WorkflowButtons.tsx';

const WorkflowItem: React.FC<{
  pipeline: PipelineDto;
  workflowId: string;
  scrollTo: (workflowId: string) => void;
  settings: WorkbenchSettingsInterface;
}> = ({ pipeline, workflowId, scrollTo, settings }) => {
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
    (item: DocumentItemDto) => {
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

  const documents: DocumentItemDto[] = useMemo(() => {
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

  const isLoading = runPipeline.isPending || fetchWorkflow.data?.status === 'running';

  return (
    <div className="flex flex-col gap-8 p-4">
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

      {!!fetchWorkflow.data && (
        <>
          <WorkflowForms workflow={fetchWorkflow.data} onSubmit={handleRun} />
          <WorkflowButtons pipeline={pipeline} workflow={fetchWorkflow.data} />
        </>
      )}
    </div>
  );
};

export default WorkflowItem;
