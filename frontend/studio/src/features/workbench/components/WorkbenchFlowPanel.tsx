import { ReactFlowProvider } from '@xyflow/react';
import { X } from 'lucide-react';
import { useMemo } from 'react';
import { WorkflowFlowViewer } from '@/features/debug';
import { useChildWorkflows, useWorkflow, useWorkflowConfigByName } from '@/hooks/useWorkflows.ts';
import { useWorkbenchLayout } from '../providers/WorkbenchLayoutProvider.tsx';

export function WorkbenchFlowPanel() {
  const { workflow, closeSidePanel } = useWorkbenchLayout();
  const fetchWorkflow = useWorkflow(workflow.id);
  const fetchChildWorkflows = useChildWorkflows(workflow.id);
  const fetchWorkflowConfig = useWorkflowConfigByName(fetchWorkflow.data?.className ?? undefined);
  const childWorkflows = useMemo(() => fetchChildWorkflows.data ?? [], [fetchChildWorkflows.data]);

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
    </div>
  );
}
