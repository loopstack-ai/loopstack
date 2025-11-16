import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../../../components/ui/dialog.tsx';
import { Settings } from 'lucide-react';
import { Button } from '../../../components/ui/button.tsx';
import { Switch } from '../../../components/ui/switch.tsx';
import { Label } from '../../../components/ui/label.tsx';
import type { WorkbenchSettingsInterface } from '../WorkflowList.tsx';

interface WorkbenchSettingsModalProps {
  settings: WorkbenchSettingsInterface;
  onSettingsChange: (settings: WorkbenchSettingsInterface) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WorkbenchSettingsModal: React.FC<WorkbenchSettingsModalProps> = ({
  settings,
  onSettingsChange,
  open,
  onOpenChange
}) => {
  const handleSettingChange = (key: keyof WorkbenchSettingsInterface, value: boolean) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-500 hover:text-gray-700 hover:cursor-pointer"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Workflow Settings</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1">
              <Label htmlFor="debug-mode" className="text-sm font-medium">
                Enable Debug Mode
              </Label>
              <p className="text-sm text-muted-foreground">Show debug info for each document</p>
            </div>
            <Switch
              id="debug-mode"
              checked={settings.enableDebugMode}
              onCheckedChange={(checked) => handleSettingChange('enableDebugMode', checked)}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1">
              <Label htmlFor="message-history" className="text-sm font-medium">
                Full Message History
              </Label>
              <p className="text-sm text-muted-foreground">
                Show all internal messages and prompts
              </p>
            </div>
            <Switch
              id="message-history"
              checked={settings.showFullMessageHistory}
              onCheckedChange={(checked) => handleSettingChange('showFullMessageHistory', checked)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkbenchSettingsModal;
