import { type Edge, type Node } from '@xyflow/react';
import React, { useEffect, useRef } from 'react';
import type { WorkflowConfigInterface, WorkflowItemInterface } from '@loopstack/contracts/api';
import type { WorkflowInterface } from '@loopstack/contracts/types';
import { useWorkflow, useWorkflowCheckpoints } from '@/hooks/useWorkflows.ts';
import type { StateNodeData } from '../../lib/flow-types.ts';
import { buildWorkflowGraph, getTransitions } from '../../lib/flow-utils.ts';

interface WorkflowGraphProps {
  parentWorkflow: unknown;
  workflow: WorkflowItemInterface;
  workflowConfig?: WorkflowConfigInterface;
  onGraphReady: (workflowId: string, nodes: Node<StateNodeData>[], edges: Edge[]) => void;
  onLoadingChange: (workflowId: string, isLoading: boolean) => void;
  direction?: 'LR' | 'TB';
}

function countTransitions(obj: unknown): number {
  return obj ? getTransitions(obj).length : 0;
}

const WorkflowGraph: React.FC<WorkflowGraphProps> = ({
  parentWorkflow,
  workflow,
  workflowConfig,
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

    const configTransitions = workflowConfig ? getTransitions(workflowConfig) : [];

    const dataKey = JSON.stringify({
      p: countTransitions(parentWorkflow),
      w: countTransitions(workflowData),
      c: configTransitions.length,
      checkpoints: checkpoints.length,
      place: workflowData?.place,
    });

    if (dataKey !== prevDataRef.current) {
      prevDataRef.current = dataKey;
      const { nodes, edges } = buildWorkflowGraph(
        parentWorkflow,
        workflowData as unknown as WorkflowInterface | undefined,
        workflow.id,
        configTransitions,
        direction,
        false,
        checkpoints,
      );
      onGraphReady(workflow.id, nodes, edges);
    }
  }, [parentWorkflow, workflow, workflowData, checkpoints, workflowConfig, onGraphReady, isLoading]);

  return null;
};

export default WorkflowGraph;
