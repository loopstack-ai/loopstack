import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PreviewEmptyState, PreviewWorkbench, useEmbedBridge } from '@/features/workbench';

export default function PreviewWorkbenchPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const [newRunDialogOpen, setNewRunDialogOpen] = useState(false);
  const { notifyNewRun } = useEmbedBridge();

  const handleNewRunSuccess = useCallback(
    (newWorkflowId: string) => {
      setNewRunDialogOpen(false);
      notifyNewRun(newWorkflowId);
    },
    [notifyNewRun],
  );

  if (!workflowId) {
    return (
      <PreviewEmptyState
        newRunDialogOpen={newRunDialogOpen}
        onNewRunDialogOpenChange={setNewRunDialogOpen}
        onNewRunSuccess={handleNewRunSuccess}
      />
    );
  }

  return <PreviewWorkbench workflowId={workflowId} onNewRunSuccess={handleNewRunSuccess} />;
}
