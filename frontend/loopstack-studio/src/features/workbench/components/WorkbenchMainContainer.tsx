import ErrorSnackbar from '../../../components/snackbars/ErrorSnackbar.tsx';
import LoadingCentered from '../../../components/LoadingCentered.tsx';
import { useFetchWorkflowsByPipeline } from '../../../hooks/useWorkflows.ts';
import type { PipelineDto } from '@loopstack/api-client';
import { useState } from 'react';
import WorkbenchSettingsModal from './WorkbenchSettingsModal.tsx';
import WorkbenchMainWorkflowList from './Main/WorkbenchMainWorkflowList.tsx';

export interface WorkbenchSettingsInterface {
  enableDebugMode: boolean;
  showFullMessageHistory: boolean;
}

interface WorkbenchMainContainerProps {
  pipeline: PipelineDto;
}

const WorkbenchMainContainer: React.FC<WorkbenchMainContainerProps> = ({ pipeline }) => {
  const fetchWorkflows = useFetchWorkflowsByPipeline(pipeline.id);

  const [openSettingsModal, setOpenSettingsModal] = useState(false);

  const [settings, setSettings] = useState<WorkbenchSettingsInterface>({
    enableDebugMode: false,
    showFullMessageHistory: false
  });

  return (
    <div className="container mx-auto px-4">
      <LoadingCentered loading={fetchWorkflows.isLoading} />
      <ErrorSnackbar error={fetchWorkflows.error} />

      <div className="flex justify-end px-3 mb-4">
        <WorkbenchSettingsModal
          settings={settings}
          onSettingsChange={setSettings}
          open={openSettingsModal}
          onOpenChange={setOpenSettingsModal}
        />
      </div>

      {fetchWorkflows.data?.length ? (
        <WorkbenchMainWorkflowList
          workflows={fetchWorkflows.data}
          pipeline={pipeline}
          settings={settings}
        />
      ) : null}
    </div>
  );
};

export default WorkbenchMainContainer;
