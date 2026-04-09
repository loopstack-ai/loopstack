import { Clock, Loader2 } from 'lucide-react';
import React, { useMemo } from 'react';
import type { WorkflowFullInterface, WorkflowItemInterface } from '@loopstack/contracts/api';
import { useChildWorkflows } from '@/hooks/useWorkflows.ts';
import WorkflowHistoryItem from './WorkflowHistoryItem.tsx';

interface WorkflowHistoryListProps {
  workflow: WorkflowFullInterface | undefined;
}

const WorkflowHistoryList: React.FC<WorkflowHistoryListProps> = ({ workflow }) => {
  const fetchChildWorkflows = useChildWorkflows(workflow?.id);
  const childWorkflows = useMemo(() => fetchChildWorkflows.data ?? [], [fetchChildWorkflows.data]);

  if (!workflow) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-8 text-sm">No workflow selected</div>
    );
  }

  if (fetchChildWorkflows.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (fetchChildWorkflows.error) {
    return <div className="text-destructive px-2 py-4 text-sm">Failed to load history</div>;
  }

  if (childWorkflows.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-8">
        <Clock className="h-6 w-6" />
        <span className="text-sm">No workflow history</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 py-2">
      {childWorkflows.map((childWorkflow: WorkflowItemInterface) => (
        <WorkflowHistoryItem key={childWorkflow.id} workflowId={childWorkflow.id} workflow={childWorkflow} />
      ))}
    </div>
  );
};

export default WorkflowHistoryList;
