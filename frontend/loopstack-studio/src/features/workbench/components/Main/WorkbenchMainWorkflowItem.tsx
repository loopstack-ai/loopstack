import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Textarea } from '../../../../components/ui/textarea';
import { Label } from '../../../../components/ui/label';
import type { DocumentItemDto, PipelineDto } from '@loopstack/api-client';
import { useFilterDocuments } from '../../../../hooks/useDocuments.ts';
import { useWorkflow } from '../../../../hooks/useWorkflows.ts';
import type { DocumentType } from '@loopstack/shared';
import LoadingCentered from '../../../../components/LoadingCentered.tsx';
import { useParams } from 'react-router-dom';
import { omit } from 'lodash';
import { Plus } from 'lucide-react';
import BasicErrorComponent from '../../../../components/content/errorAlert.tsx';
import ErrorSnackbar from '../../../../components/snackbars/ErrorSnackbar';
import type { WorkbenchSettingsInterface } from '../WorkbenchMainContainer.tsx';
import DocumentRenderer from './DocumentRenderer.tsx';
import DocumentMetadataPills from './DocumentMetadataPills.tsx';
import WorkflowUi from './WorkflowUi.tsx';
import WorkflowButtons from './Workflow/WorkflowButtons.tsx';

const WorkbenchMainWorkflowItem: React.FC<{
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

  // const handleOpenContextModal = () => {
  //     setContextModalOpen(true);
  // }

  // auto scroll to the item on a navigation event (clickId) but only after element is fully loaded
  useEffect(() => {
    if (paramsWorkflowId === workflowId && fetchWorkflow.isSuccess && fetchDocuments.isSuccess) {
      scrollTo(workflowId);
    }
  }, [fetchWorkflow.isSuccess, fetchDocuments.isSuccess, workflowId, paramsWorkflowId, clickId]);

  const isWorkflowActive = fetchWorkflow.data?.status === 'waiting';

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

      {fetchWorkflow.isSuccess && fetchDocuments.isSuccess ? (
        <div className="space-y-0">
          {fetchDocuments.data.map((item: DocumentItemDto) => {
            const document = item as DocumentType;

            // document is active when created at current place
            // or when explicitly set to enabled for specific places
            const isDocumentActive =
              item.place === fetchWorkflow.data.place ||
              !!document.meta?.enableAtPlaces?.includes(fetchWorkflow.data.place);

            const isActive = isWorkflowActive && isDocumentActive;

            // document will be hidden if configured as hidden
            // or when configured hidden for specific places
            let hidden =
              document.meta?.['hidden'] ||
              document.ui?.hidden ||
              !!document.meta?.hideAtPlaces?.includes(fetchWorkflow.data.place);

            const isInternalMessage = false; //['tool'].includes(document.content.role);

            if (
              !settings.showFullMessageHistory &&
              (isInternalMessage || item.tags?.includes('internal'))
            ) {
              hidden = true;
            }

            return hidden ? (
              ''
            ) : (
              <div key={`item-${workflowId}-${item.id}`} className="py-4">
                <div className="w-full">
                  <DocumentRenderer
                    document={item}
                    workflow={fetchWorkflow.data}
                    pipeline={pipeline}
                    isActive={isActive}
                  />
                  {settings.enableDebugMode ? (
                    <DocumentMetadataPills
                      metaData={{
                        ...(document.meta?.data ?? {}),
                        document: {
                          ...item,
                          meta: omit(item.meta ?? {}, ['data'])
                        }
                      }}
                    />
                  ) : (
                    <></>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        ''
      )}

      {fetchWorkflow.data?.status === 'running' ? ( //WorkflowState.Running ? ( todo
        <LoadingCentered loading={true} className="m-2" />
      ) : (
        ''
      )}

      {fetchWorkflow.data ? <WorkflowUi workflow={fetchWorkflow.data} /> : ''}
      {fetchWorkflow.data ? (
        <WorkflowButtons pipeline={pipeline} workflow={fetchWorkflow.data} />
      ) : (
        ''
      )}

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

export default WorkbenchMainWorkflowItem;
