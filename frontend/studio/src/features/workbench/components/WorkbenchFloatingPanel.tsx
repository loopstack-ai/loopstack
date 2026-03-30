import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type FloatingPanelId, useWorkbenchLayout } from '../providers/WorkbenchLayoutProvider.tsx';
import PipelineHistoryList from './PipelineHistoryList.tsx';
import { WorkbenchSecretsPanel } from './WorkbenchSecretsPanel.tsx';

const PANEL_TITLES: Record<FloatingPanelId, string> = {
  history: 'Run Log',
  secrets: 'Secrets',
};

function HistoryContent() {
  const { pipeline } = useWorkbenchLayout();
  return (
    <div className="overflow-auto p-2">
      <PipelineHistoryList pipeline={pipeline} />
    </div>
  );
}

export function WorkbenchFloatingPanel() {
  const { activeFloatingPanel, closeFloatingPanel } = useWorkbenchLayout();

  if (!activeFloatingPanel) {
    return null;
  }

  return (
    <div
      className={cn(
        'border-l bg-background absolute right-0 top-0 bottom-0 z-20 flex w-80 flex-col shadow-lg',
        'animate-in slide-in-from-right duration-200',
      )}
    >
      <div className="border-b flex h-12 shrink-0 items-center justify-between px-3">
        <span className="text-sm font-medium">{PANEL_TITLES[activeFloatingPanel]}</span>
        <button
          onClick={closeFloatingPanel}
          className="text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {activeFloatingPanel === 'history' && <HistoryContent />}
        {activeFloatingPanel === 'secrets' && <WorkbenchSecretsPanel />}
      </div>
    </div>
  );
}
