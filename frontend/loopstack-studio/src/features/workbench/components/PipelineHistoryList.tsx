import { Clock, Loader2 } from 'lucide-react';
import React, { useMemo } from 'react';
import type { PipelineDto, WorkflowItemDto } from '@loopstack/api-client';
import { useFetchWorkflowsByPipeline } from '@/hooks/useWorkflows.ts';
import WorkflowHistoryItem from './WorkflowHistoryItem.tsx';

interface PipelineHistoryListProps {
  pipeline: PipelineDto | undefined;
}

const PipelineHistoryList: React.FC<PipelineHistoryListProps> = ({ pipeline }) => {
  const fetchWorkflows = useFetchWorkflowsByPipeline(pipeline?.id ?? '');
  const workflows = useMemo(() => fetchWorkflows.data ?? [], [fetchWorkflows.data]);

  if (!pipeline) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-8 text-sm">No pipeline selected</div>
    );
  }

  if (fetchWorkflows.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (fetchWorkflows.error) {
    return <div className="text-destructive px-2 py-4 text-sm">Failed to load history</div>;
  }

  if (workflows.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-8">
        <Clock className="h-6 w-6" />
        <span className="text-sm">No workflow history</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 py-2">
      {workflows.map((workflow: WorkflowItemDto) => (
        <WorkflowHistoryItem key={workflow.id} workflowId={workflow.id} workflow={workflow} />
      ))}
    </div>
  );
};

export default PipelineHistoryList;
