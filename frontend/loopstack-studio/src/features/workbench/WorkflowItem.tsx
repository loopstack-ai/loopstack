import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../components/ui/dialog.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Textarea } from '../../components/ui/textarea.tsx';
import { Label } from '../../components/ui/label.tsx';
import type { DocumentItemDto, PipelineDto, WorkflowDto } from '@loopstack/api-client';
import { useWorkflow } from '../../hooks/useWorkflows.ts';
import LoadingCentered from '../../components/LoadingCentered.tsx';
import { useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import BasicErrorComponent from '../../components/content/errorAlert.tsx';
import type { WorkbenchSettingsInterface } from './WorkflowList.tsx';
import WorkflowUi from './components/WorkflowUi.tsx';
import WorkflowButtons from './components/buttons/WorkflowButtons.tsx';
import DocumentList from '@/features/workbench/components/DocumentList.tsx';
import { useFilterDocuments } from '@/hooks/useDocuments.ts';
import ErrorSnackbar from '@/components/snackbars/ErrorSnackbar.tsx';

const WorkflowItem: React.FC<{
  pipeline: PipelineDto;
  workflowId: string;
  scrollTo: (workflowId: string) => void;
  settings: WorkbenchSettingsInterface;
}> = ({ pipeline, workflowId, scrollTo, settings }) => {
  const { workflowId: paramsWorkflowId, clickId } = useParams();
  const fetchWorkflow = useWorkflow(workflowId);
  const fetchDocuments = useFilterDocuments(workflowId);

  const [contextModalOpen, setContextModalOpen] = useState(false);

  const handleCloseContextModal = () => {
    setContextModalOpen(false);
  };

  // auto scroll to the item on a navigation event (clickId) but only after element is fully loaded
  useEffect(() => {
    if (paramsWorkflowId === workflowId && fetchWorkflow.isSuccess && fetchDocuments.isSuccess) {
      scrollTo(workflowId);
    }
  }, [fetchWorkflow.isSuccess, fetchDocuments.isSuccess, workflowId, paramsWorkflowId, clickId]);

  // const { messages, sendMessage, status, regenerate } = useChat();

  return (
    <div>
      <LoadingCentered loading={fetchWorkflow.isLoading || fetchDocuments.isLoading} />
      <ErrorSnackbar error={fetchDocuments.error} />

      <BasicErrorComponent error={fetchWorkflow.data?.errorMessage} />

      {/*{settings.enableDebugMode ? <div className="m-1 mx-3">*/}
      {/*    <IconButtonSimple*/}
      {/*      icon={<AssignmentIcon fontSize="small" />}*/}
      {/*      onConfirm={handleOpenContextModal}*/}
      {/*      loading={false}*/}
      {/*    />*/}
      {/*</div> : ''}*/}

      {fetchWorkflow.isSuccess && (
        <DocumentList
          pipeline={pipeline}
          workflow={fetchWorkflow.data as WorkflowDto}
          documents={fetchDocuments.data as DocumentItemDto[] ?? []}
          scrollTo={scrollTo}
          settings={settings}
        />
      )}

      {fetchWorkflow.data?.status === 'running' && ( //WorkflowState.Running ? ( todo
        <LoadingCentered loading={true} className="m-2" />
      )}

      {!!fetchWorkflow.data && <>
        <WorkflowUi workflow={fetchWorkflow.data} />
        <WorkflowButtons pipeline={pipeline} workflow={fetchWorkflow.data} />
      </>}

      <Dialog open={contextModalOpen} onOpenChange={setContextModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Update Workflow Context</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="custom-context">Custom Context</Label>
              <Textarea
                id="custom-context"
                placeholder="Add your custom instructions here."
                value="..."
                rows={10}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Custom instructions will be added to all prompts of this workflow and persist for
                future executions. Use this to align the behavior of this step to your needs.
              </p>
            </div>

            <div>
              <input accept="*" style={{ display: 'none' }} id="file-upload-button" type="file" />
              <Label htmlFor="file-upload-button">
                <Button variant="outline" asChild className="cursor-pointer">
                  <span>
                    <Plus className="w-4 h-4 mr-2" />
                    Upload File
                  </span>
                </Button>
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseContextModal}>
              Cancel
            </Button>
            <Button onClick={handleCloseContextModal}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkflowItem;
