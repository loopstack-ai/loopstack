import { ReactFlowProvider } from '@xyflow/react';
import { Clock, GitGraph, MonitorPlay } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import ErrorSnackbar from '@/components/snackbars/ErrorSnackbar.tsx';
import PipelineFlowViewer from '@/features/debug/components/PipelineFlowViewer.tsx';
import WorkflowItem from '@/features/workbench/WorkflowItem.tsx';
import PipelineHistoryList from '@/features/workbench/components/PipelineHistoryList.tsx';
import LoadingCentered from '../components/LoadingCentered.tsx';
import { usePipeline, usePipelineConfig } from '../hooks/usePipelines.ts';
import { useFetchWorkflowsByPipeline } from '../hooks/useWorkflows.ts';
import { useWorkspace } from '../hooks/useWorkspaces.ts';
import { requireParam } from '../lib/requireParam.ts';

type PreviewTab = 'preview' | 'flow' | 'history';

const EMBED_MESSAGE_TYPE = 'loopstack:embed:workflow-completed';
const EMBED_RESIZE_MESSAGE_TYPE = 'loopstack:embed:resize';

export default function PreviewWorkbenchPage() {
  const params = useParams<{ pipelineId: string }>();
  const pipelineId = requireParam(params, 'pipelineId');
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<PreviewTab>('preview');

  const fetchPipeline = usePipeline(pipelineId);
  const fetchWorkflows = useFetchWorkflowsByPipeline(pipelineId);
  const workflows = useMemo(() => fetchWorkflows.data ?? [], [fetchWorkflows.data]);
  const notifiedRef = useRef(false);

  const workspaceId = fetchPipeline.data?.workspaceId;
  const fetchWorkspace = useWorkspace(workspaceId);
  const workspaceBlockName = fetchWorkspace.data?.blockName;
  const pipelineBlockName = fetchPipeline.data?.blockName;
  const fetchPipelineConfig = usePipelineConfig(workspaceBlockName, pipelineBlockName);

  // Notify parent when all workflows have completed
  useEffect(() => {
    if (!fetchWorkflows.data || notifiedRef.current) return;

    const allCompleted = fetchWorkflows.data.length > 0 && fetchWorkflows.data.every((w) => w.status === 'completed');

    if (allCompleted && window.parent !== window) {
      notifiedRef.current = true;
      window.parent.postMessage(
        {
          type: EMBED_MESSAGE_TYPE,
          pipelineId,
        },
        window.location.origin,
      );
    }
  }, [fetchWorkflows.data, pipelineId]);

  // Report content height to parent for dynamic iframe sizing
  useEffect(() => {
    if (window.parent === window || !containerRef.current) return;

    const postHeight = () => {
      if (!containerRef.current) return;
      const height = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight,
      );
      window.parent.postMessage(
        {
          type: EMBED_RESIZE_MESSAGE_TYPE,
          pipelineId,
          height,
        },
        window.location.origin,
      );
    };

    const observer = new ResizeObserver(postHeight);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [pipelineId]);

  const scrollTo = () => {};

  const settings = {
    enableDebugMode: false,
    showFullMessageHistory: false,
  };

  const tabs: { value: PreviewTab; label: string; icon: React.ReactNode }[] = [
    { value: 'preview', label: 'Preview', icon: <MonitorPlay className="h-4 w-4" /> },
    { value: 'flow', label: 'Flow', icon: <GitGraph className="h-4 w-4" /> },
    { value: 'history', label: 'History', icon: <Clock className="h-4 w-4" /> },
  ];

  return (
    <div ref={containerRef} className="flex h-screen flex-col overflow-hidden">
      <div className="flex h-10 shrink-0 items-center gap-1 px-3">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        <ErrorSnackbar error={fetchPipeline.error} />
        <ErrorSnackbar error={fetchWorkflows.error} />

        {activeTab === 'preview' && (
          <div className="px-6 py-4">
            <LoadingCentered loading={fetchPipeline.isLoading || fetchWorkflows.isLoading}>
              {fetchPipeline.data && fetchWorkflows.data
                ? fetchWorkflows.data.map((workflow) => (
                    <WorkflowItem
                      key={workflow.id}
                      pipeline={fetchPipeline.data}
                      workflowId={workflow.id}
                      scrollTo={scrollTo}
                      settings={settings}
                      embed
                    />
                  ))
                : null}
            </LoadingCentered>
          </div>
        )}

        {activeTab === 'flow' && (
          <div className="h-full">
            <LoadingCentered loading={fetchPipeline.isLoading || fetchWorkflows.isLoading}>
              {workflows.length > 0 ? (
                <ReactFlowProvider>
                  <PipelineFlowViewer
                    pipelineId={pipelineId}
                    workflows={workflows}
                    pipelineConfig={fetchPipelineConfig.data}
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

        {activeTab === 'history' && (
          <div className="px-4">
            <PipelineHistoryList pipeline={fetchPipeline.data} />
          </div>
        )}
      </div>
    </div>
  );
}
