import { ReactFlowProvider } from '@xyflow/react';
import { ListOrdered, Play, ScrollText, Workflow } from 'lucide-react';
import { useCallback, useState } from 'react';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import LoadingCentered from '@/components/feedback/LoadingCentered';
import { Button } from '@/components/ui/button.tsx';
import { WorkflowFlowViewer } from '@/features/debug';
import { useWorkflow, useWorkflowConfigByName } from '@/hooks/useWorkflows.ts';
import WorkflowItem from '../WorkflowItem';
import { useEmbedBridge } from '../hooks/useEmbedBridge';
import { EmbedLogsContent } from './EmbedLogsContent';
import { NewRunDialog } from './NewRunDialog';
import WorkflowHistoryList from './WorkflowHistoryList';

type PreviewTab = 'output' | 'graph' | 'run-log' | 'logs';

const TABS: { value: PreviewTab; label: string; icon: React.ReactNode }[] = [
  { value: 'output', label: 'Output', icon: <ScrollText className="h-3.5 w-3.5" /> },
  { value: 'graph', label: 'Graph', icon: <Workflow className="h-3.5 w-3.5" /> },
  { value: 'run-log', label: 'Run Log', icon: <ListOrdered className="h-3.5 w-3.5" /> },
  { value: 'logs', label: 'Logs', icon: <ScrollText className="h-3.5 w-3.5" /> },
];

const PREVIEW_SETTINGS = {
  enableDebugMode: false,
  showFullMessageHistory: false,
};

interface PreviewWorkbenchProps {
  workflowId: string;
  onNewRunSuccess: (workflowId: string) => void;
}

export function PreviewWorkbench({ workflowId, onNewRunSuccess }: PreviewWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('output');
  const [newRunDialogOpen, setNewRunDialogOpen] = useState(false);

  const fetchWorkflow = useWorkflow(workflowId);
  const fetchWorkflowConfig = useWorkflowConfigByName(fetchWorkflow.data?.workflowName);

  const { containerRef } = useEmbedBridge({
    workflowId,
    workflowStatus: fetchWorkflow.data?.status,
  });

  const handleNewRunSuccess = useCallback(
    (newWorkflowId: string) => {
      setNewRunDialogOpen(false);
      onNewRunSuccess(newWorkflowId);
    },
    [onNewRunSuccess],
  );

  return (
    <div ref={containerRef} className="flex h-screen flex-col overflow-hidden">
      <div className="bg-muted/50 flex h-11 shrink-0 items-center justify-between border-b px-3">
        <div className="bg-background flex items-center rounded-md border p-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
                activeTab === tab.value
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={() => setNewRunDialogOpen(true)}>
          <Play className="h-3 w-3" />
          New Run
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <ErrorSnackbar error={fetchWorkflow.error} />

        {activeTab === 'output' && (
          <div className="px-4 py-3">
            <LoadingCentered loading={fetchWorkflow.isLoading}>
              {fetchWorkflow.data ? (
                <WorkflowItem
                  workflow={fetchWorkflow.data}
                  workflowId={fetchWorkflow.data.id}
                  scrollTo={() => {}}
                  settings={PREVIEW_SETTINGS}
                />
              ) : null}
            </LoadingCentered>
          </div>
        )}

        {activeTab === 'graph' && (
          <div className="h-full">
            <LoadingCentered loading={fetchWorkflow.isLoading}>
              {fetchWorkflow.data ? (
                <ReactFlowProvider>
                  <WorkflowFlowViewer
                    workflowId={workflowId}
                    workflows={[fetchWorkflow.data]}
                    workflowConfig={fetchWorkflowConfig.data}
                    direction="TB"
                  />
                </ReactFlowProvider>
              ) : (
                <div className="text-muted-foreground flex h-full items-center justify-center">
                  <p className="text-sm">No workflows found</p>
                </div>
              )}
            </LoadingCentered>
          </div>
        )}

        {activeTab === 'run-log' && (
          <div className="px-4">
            <WorkflowHistoryList workflow={fetchWorkflow.data} />
          </div>
        )}

        {activeTab === 'logs' && <EmbedLogsContent />}
      </div>

      <NewRunDialog open={newRunDialogOpen} onOpenChange={setNewRunDialogOpen} onSuccess={handleNewRunSuccess} />
    </div>
  );
}
