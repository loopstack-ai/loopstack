import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { PipelineInterface } from '@loopstack/contracts/api';
import BasicErrorComponent from '@/components/feedback/ErrorAlert';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import LoadingCentered from '@/components/feedback/LoadingCentered';
import { DocumentList } from '@/features/documents';
import WorkflowForms from '@/features/workbench/components/WorkflowForms.tsx';
import { cn } from '@/lib/utils';
import type { WorkbenchSettingsInterface } from './WorkflowList.tsx';
import { useWorkflowData } from './hooks/useWorkflowData.ts';

const WorkflowItem: React.FC<{
  pipeline: PipelineInterface;
  workflowId: string;
  scrollTo: (workflowId: string) => void;
  settings: WorkbenchSettingsInterface;
  embed?: boolean;
}> = ({ pipeline, workflowId, scrollTo, settings, embed }) => {
  const { workflowId: paramsWorkflowId, clickId } = useParams();

  const {
    workflow,
    workflowLoading,
    workflowReady,
    workflowError,
    documents,
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

  return (
    <div className={cn('flex flex-col', embed ? 'p-0' : 'p-4')}>
      <LoadingCentered loading={workflowLoading || documentsLoading} />
      <ErrorSnackbar error={documentsError} />

      <BasicErrorComponent error={workflowError} />

      {workflowReady && workflow && (
        <DocumentList
          pipeline={pipeline}
          workflow={workflow}
          documents={documents}
          scrollTo={scrollTo}
          settings={settings}
          isLoading={isLoading}
        />
      )}

      <LoadingCentered loading={isLoading} />

      {!!workflow && (
        <div className="mt-6">
          <WorkflowForms workflow={workflow} pipeline={pipeline} onSubmit={handleRun} />
        </div>
      )}
    </div>
  );
};

export default WorkflowItem;
