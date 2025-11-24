import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog.tsx';
import type { WorkspaceDto } from '@loopstack/api-client';
import PipelineForm from './PipelineForm.tsx';

interface CreatePipelineDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: WorkspaceDto;
  onSuccess: () => void;
}

const CreatePipelineDialog = ({
  isOpen,
  onOpenChange,
  workspace,
  onSuccess
}: CreatePipelineDialogProps) => {
  const handleSuccess = () => {
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTitle>Run Pipeline</DialogTitle>
      <DialogContent className="max-h-[80vh] min-h-[300px] !max-w-2xl">
        <div className="mt-4 overflow-y-auto">
          <PipelineForm
            title="Run Pipeline"
            workspace={workspace}
            onSuccess={handleSuccess}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePipelineDialog;
