import { ReactFlowProvider } from '@xyflow/react';
import { ArrowDownIcon, ListOrdered, Workflow as WorkflowIcon } from 'lucide-react';
import React, { useState } from 'react';
import type { WorkflowFullInterface } from '@loopstack/contracts/api';
import { Button } from '@/components/ui/button.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import { WorkflowFlowViewer } from '@/features/debug';
import WorkflowItem from '@/features/workbench/WorkflowItem.tsx';
import { useChildWorkflows, useWorkflowConfigByName } from '@/hooks/useWorkflows.ts';
import WorkbenchSettingsModal from './components/WorkbenchSettingsModal.tsx';
import WorkflowHistoryList from './components/WorkflowHistoryList.tsx';
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
  const fetchChildWorkflows = useChildWorkflows(workflow.id);
  const childWorkflows = fetchChildWorkflows.data ?? [];

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

            <Dialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-500 hover:cursor-pointer hover:text-gray-700"
                    >
                      <ListOrdered className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Run Log</TooltipContent>
              </Tooltip>
              <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Run Log</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-auto">
                  <WorkflowHistoryList workflow={workflow} />
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-500 hover:cursor-pointer hover:text-gray-700"
                    >
                      <WorkflowIcon className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Graph</TooltipContent>
              </Tooltip>
              <DialogContent className="sm:max-w-4xl h-[70vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Graph</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-hidden">
                  {childWorkflows.length > 0 ? (
                    <ReactFlowProvider>
                      <WorkflowFlowViewer
                        workflowId={workflow.id}
                        workflows={childWorkflows}
                        workflowConfig={fetchWorkflowConfig.data}
                      />
                    </ReactFlowProvider>
                  ) : (
                    <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                      No workflows found
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

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
