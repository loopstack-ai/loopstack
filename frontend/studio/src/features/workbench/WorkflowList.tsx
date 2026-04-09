import { ArrowDownIcon } from 'lucide-react';
import React, { useState } from 'react';
import type { WorkflowFullInterface } from '@loopstack/contracts/api';
import { Button } from '@/components/ui/button.tsx';
import WorkflowItem from '@/features/workbench/WorkflowItem.tsx';
import { useWorkflowConfigByName } from '@/hooks/useWorkflows.ts';
import WorkbenchSettingsModal from './components/WorkbenchSettingsModal.tsx';
import WorkflowButtons from './components/buttons/WorkflowButtons.tsx';
import { useWorkflowListState } from './hooks/useWorkflowListState.ts';

export interface WorkbenchSettingsInterface {
  enableDebugMode: boolean;
  showFullMessageHistory: boolean;
}

interface WorkbenchMainContainerProps {
  workflow: WorkflowFullInterface;
}

const WorkflowList: React.FC<WorkbenchMainContainerProps> = ({ workflow }) => {
  const [openSettingsModal, setOpenSettingsModal] = useState(false);
  const [settings, setSettings] = useState<WorkbenchSettingsInterface>({
    enableDebugMode: false,
    showFullMessageHistory: false,
  });

  const { listRef, scrollTo, canScrollDown, scrollToBottom } = useWorkflowListState();
  const fetchWorkflowConfig = useWorkflowConfigByName(workflow.className ?? undefined);

  return (
    <div>
      {canScrollDown && (
        <Button
          variant="outline"
          size="icon"
          onClick={scrollToBottom}
          className="bg-background/80 fixed right-[calc(var(--sidebar-width)+1.5rem)] bottom-6 z-50 rounded-full shadow-md backdrop-blur-sm"
        >
          <ArrowDownIcon className="size-4" />
        </Button>
      )}

      <div className="mb-10" ref={listRef}>
        <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 backdrop-blur">
          <div className="flex w-full items-center gap-2 rounded-md p-2 px-3 text-left text-sm font-medium">
            <span className="flex-1 truncate text-sm">{fetchWorkflowConfig.data?.title ?? workflow.alias}</span>
            <WorkflowButtons workflow={workflow} workflowId={workflow.id} />
            <WorkbenchSettingsModal
              settings={settings}
              onSettingsChange={setSettings}
              open={openSettingsModal}
              onOpenChange={setOpenSettingsModal}
            />
          </div>
        </div>
        <div className="max-w-4xl py-1">
          <WorkflowItem workflow={workflow} workflowId={workflow.id} scrollTo={scrollTo} settings={settings} />
        </div>
      </div>
    </div>
  );
};

export default WorkflowList;
