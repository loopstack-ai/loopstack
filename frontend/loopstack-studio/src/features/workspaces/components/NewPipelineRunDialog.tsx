import { Dialog, DialogContent } from '@/components/ui/dialog.tsx';
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
      <DialogContent>
        <div className="mt-4">
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
