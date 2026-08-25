import { ReactFlowProvider } from '@xyflow/react';
import { ArrowDownIcon, Layers, ListOrdered, ListVideo, Workflow as WorkflowIcon } from 'lucide-react';
import React, { useState } from 'react';
import type { WorkflowFullInterface } from '@loopstack/contracts/api';
import { Button } from '@/components/ui/button.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import { WorkflowFlowViewer } from '@/features/debug';
import { RunView } from '@/features/run-view/RunView.tsx';
import WorkflowItem from '@/features/workbench/WorkflowItem.tsx';
import { useChildWorkflows, useWorkflowConfigByName } from '@/hooks/useWorkflows.ts';
import { cn } from '@/lib/utils';
import { useOptionalStudioPreferences } from '@/providers/StudioPreferencesProvider.tsx';
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

  // View toggle: legacy document tree vs the canonical run view. Persisted as a studio
  // preference; falls back to local state when no provider is mounted (embed contexts).
  const studioPreferences = useOptionalStudioPreferences();
  const [localView, setLocalView] = useState<'classic' | 'run'>('classic');
  const view = studioPreferences?.preferences.workbenchView ?? localView;
  const setView = (next: 'classic' | 'run') =>
    studioPreferences ? studioPreferences.setPreference('workbenchView', next) : setLocalView(next);

  const { listRef, scrollTo, canScrollDown, scrollToBottom } = useWorkflowListState();
  const fetchWorkflowConfig = useWorkflowConfigByName(workflow.workflowName);
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
            <span className="flex-1 truncate text-sm">{fetchWorkflowConfig.data?.title ?? workflow.workflowName}</span>

            <div className="border-input mr-1 flex items-center rounded-md border p-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn('h-6 w-6', view === 'classic' && 'bg-accent text-accent-foreground')}
                    onClick={() => setView('classic')}
                  >
                    <Layers className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Classic view</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn('h-6 w-6', view === 'run' && 'bg-accent text-accent-foreground')}
                    onClick={() => setView('run')}
                  >
                    <ListVideo className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Run view</TooltipContent>
              </Tooltip>
            </div>

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
                  <ReactFlowProvider>
                    <WorkflowFlowViewer
                      workflowId={workflow.id}
                      workflows={[workflow, ...childWorkflows]}
                      workflowConfig={fetchWorkflowConfig.data}
                    />
                  </ReactFlowProvider>
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
          {view === 'run' ? (
            <div className="p-4">
              <RunView workflowId={workflow.id} settings={settings} />
            </div>
          ) : (
            <WorkflowItem workflow={workflow} workflowId={workflow.id} scrollTo={scrollTo} settings={settings} />
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowList;
