import { ReactFlowProvider } from '@xyflow/react';
import { X } from 'lucide-react';
import { useMemo } from 'react';
import { PipelineFlowViewer } from '@/features/debug';
import { usePipeline, usePipelineConfigByName } from '@/hooks/usePipelines.ts';
import { useFetchWorkflowsByPipeline } from '@/hooks/useWorkflows.ts';
import { useWorkspace } from '@/hooks/useWorkspaces.ts';
import { useWorkbenchLayout } from '../providers/WorkbenchLayoutProvider.tsx';

export function WorkbenchFlowPanel() {
  const { pipeline, closeSidePanel } = useWorkbenchLayout();
  const fetchPipeline = usePipeline(pipeline.id);
  const fetchWorkspace = useWorkspace(pipeline.workspaceId);
  const fetchWorkflows = useFetchWorkflowsByPipeline(pipeline.id);
  const fetchPipelineConfig = usePipelineConfigByName(fetchWorkspace.data?.blockName, fetchPipeline.data?.blockName);
  const workflows = useMemo(() => fetchWorkflows.data ?? [], [fetchWorkflows.data]);

  return (
    <div className="border-l bg-background flex w-1/2 shrink-0 flex-col">
      <div className="border-b flex h-12 shrink-0 items-center justify-between px-3">
        <span className="text-sm font-medium">Graph</span>
        <button
          onClick={closeSidePanel}
          className="text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {workflows.length > 0 ? (
          <ReactFlowProvider>
            <PipelineFlowViewer
              pipelineId={pipeline.id}
              workflows={workflows}
              pipelineConfig={fetchPipelineConfig.data}
            />
          </ReactFlowProvider>
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            No workflows found
          </div>
        )}
      </div>
    </div>
  );
}
