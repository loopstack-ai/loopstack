import { MonitorPlay } from 'lucide-react';
import React from 'react';
import { useWorkbenchLayout } from '@/features/workbench/providers/WorkbenchLayoutProvider.tsx';
import { Button } from '../../ui/button.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';

interface SandboxRunOptions {
  slotId?: string;
  label?: string;
}

interface SandboxRunProps {
  ui?: SandboxRunOptions;
  disabled: boolean;
}

export const SandboxRun: React.FC<SandboxRunProps> = ({ ui, disabled }) => {
  const { openPreviewWithEnvironment, environments } = useWorkbenchLayout();

  const slotId = ui?.slotId;
  const env = slotId ? environments?.find((e) => e.slotId === slotId) : undefined;
  const envExists = !!env;
  const tooltipLabel = env?.envName ? `Open ${env.envName}` : 'Open Sandbox';

  const handleClick = () => {
    if (slotId) {
      openPreviewWithEnvironment(slotId);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="default" size="icon" disabled={disabled || !envExists} onClick={handleClick}>
          <MonitorPlay className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltipLabel}</TooltipContent>
    </Tooltip>
  );
};
