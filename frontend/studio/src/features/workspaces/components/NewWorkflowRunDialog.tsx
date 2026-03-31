import type { WorkspaceInterface } from '@loopstack/contracts/api';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog.tsx';
import WorkflowForm from './WorkflowRunForm.tsx';

interface CreateWorkflowDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: WorkspaceInterface;
  onSuccess: () => void;
}

const CreateWorkflowDialog = ({ isOpen, onOpenChange, workspace, onSuccess }: CreateWorkflowDialogProps) => {
  const handleSuccess = () => {
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] min-h-[300px] !max-w-2xl">
        <DialogTitle>Run Workflow</DialogTitle>
        <div className="mt-4 overflow-y-auto">
          <WorkflowForm title="Run Workflow" workspace={workspace} onSuccess={handleSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateWorkflowDialog;
