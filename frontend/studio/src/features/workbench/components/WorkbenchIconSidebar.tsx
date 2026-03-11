import { Clock, GitGraph, MonitorPlay, Navigation } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import { cn } from '@/lib/utils';
import { useWorkbenchLayout } from '../providers/WorkbenchLayoutProvider.tsx';

interface IconButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function IconButton({ icon, label, active, onClick }: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:cursor-pointer',
            active
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
          )}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
}

export function WorkbenchIconSidebar() {
  const {
    previewPanelEnabled,
    isDeveloperMode,
    activeFloatingPanel,
    toggleFloatingPanel,
    activeSidePanel,
    toggleSidePanel,
  } = useWorkbenchLayout();

  return (
    <div className="border-l bg-background flex w-12 shrink-0 flex-col items-center gap-1 py-2">
      {previewPanelEnabled && (
        <IconButton
          icon={<MonitorPlay className="h-5 w-5" />}
          label="Preview"
          active={activeSidePanel === 'preview'}
          onClick={() => toggleSidePanel('preview')}
        />
      )}

      {isDeveloperMode && (
        <>
          <IconButton
            icon={<GitGraph className="h-5 w-5" />}
            label="Flow Chart"
            active={activeSidePanel === 'flow'}
            onClick={() => toggleSidePanel('flow')}
          />
          <IconButton
            icon={<Clock className="h-5 w-5" />}
            label="History"
            active={activeFloatingPanel === 'history'}
            onClick={() => toggleFloatingPanel('history')}
          />
        </>
      )}

      <IconButton
        icon={<Navigation className="h-5 w-5" />}
        label="Navigation"
        active={activeFloatingPanel === 'navigation'}
        onClick={() => toggleFloatingPanel('navigation')}
      />
    </div>
  );
}
