import { type Edge, type Node } from '@xyflow/react';
import React, { useEffect, useRef } from 'react';
import type { PipelineConfigInterface, WorkflowItemInterface } from '@loopstack/contracts/api';
import { useWorkflow, useWorkflowCheckpoints } from '@/hooks/useWorkflows.ts';
import type { StateNodeData } from '../../lib/flow-types.ts';
import { buildWorkflowGraph, getTransitions } from '../../lib/flow-utils.ts';

interface WorkflowGraphProps {
  pipeline: unknown;
  workflow: WorkflowItemInterface;
  pipelineConfig?: PipelineConfigInterface;
  onGraphReady: (workflowId: string, nodes: Node<StateNodeData>[], edges: Edge[]) => void;
  onLoadingChange: (workflowId: string, isLoading: boolean) => void;
  direction?: 'LR' | 'TB';
}

function countTransitions(obj: unknown): number {
  return obj ? getTransitions(obj).length : 0;
}

const WorkflowGraph: React.FC<WorkflowGraphProps> = ({
  pipeline,
  workflow,
  pipelineConfig,
  onGraphReady,
  onLoadingChange,
  direction = 'LR',
}) => {
  const fetchWorkflow = useWorkflow(workflow.id);
  const workflowData = fetchWorkflow.data;
  const checkpointsQuery = useWorkflowCheckpoints(workflow.id);
  const checkpoints = checkpointsQuery.data ?? [];
  const prevDataRef = useRef<string | null>(null);

  const isLoading = fetchWorkflow.isLoading || checkpointsQuery.isLoading;

  useEffect(() => {
    onLoadingChange(workflow.id, isLoading);
  }, [workflow.id, isLoading, onLoadingChange]);

  useEffect(() => {
    if (isLoading) return;

    const configTransitions = pipelineConfig ? getTransitions(pipelineConfig) : [];

    const dataKey = JSON.stringify({
      p: countTransitions(pipeline),
      w: countTransitions(workflowData),
      c: configTransitions.length,
      checkpoints: checkpoints.length,
      place: workflowData?.place,
    });

    if (dataKey !== prevDataRef.current) {
      prevDataRef.current = dataKey;
      const { nodes, edges } = buildWorkflowGraph(
        pipeline,
        workflowData,
        workflow.id,
        configTransitions,
        direction,
        false,
        checkpoints,
      );
      onGraphReady(workflow.id, nodes, edges);
    }
  }, [pipeline, workflow, workflowData, checkpoints, pipelineConfig, onGraphReady, isLoading]);

  return null;
};

export default WorkflowGraph;
