import React, { useEffect, useRef } from 'react';
import { type Edge, type Node } from '@xyflow/react';
import type { WorkflowItemDto } from '@loopstack/api-client';
import type { WorkflowInterface } from '@loopstack/contracts/types';
import { useWorkflow } from '@/hooks/useWorkflows.ts';
import { buildWorkflowGraph, getTransitions } from '../../lib/flow-utils.ts';
import type { StateNodeData } from './StateNode.tsx';

interface WorkflowGraphProps {
  pipeline: any;
  workflow: WorkflowItemDto;
  onGraphReady: (workflowId: string, nodes: Node<StateNodeData>[], edges: Edge[]) => void;
  onLoadingChange: (workflowId: string, isLoading: boolean) => void;
}

const WorkflowGraph: React.FC<WorkflowGraphProps> = ({ pipeline, workflow, onGraphReady, onLoadingChange }) => {
  const fetchWorkflow = useWorkflow(workflow.id);
  const workflowData = fetchWorkflow.data as WorkflowInterface | undefined;
  const prevDataRef = useRef<string | null>(null);

  useEffect(() => {
    onLoadingChange(workflow.id, fetchWorkflow.isLoading);
  }, [workflow.id, fetchWorkflow.isLoading, onLoadingChange]);

  useEffect(() => {
    const getTransitionsSimple = (obj: any) => {
      if (!obj) return 0;
      const t = getTransitions(obj);
      return t.length;
    };

    const dataKey = JSON.stringify({
      p: getTransitionsSimple(pipeline),
      w: getTransitionsSimple(workflowData),
      history: workflowData?.history?.length,
      place: workflowData?.place,
    });

    if (dataKey !== prevDataRef.current) {
      prevDataRef.current = dataKey;
      const { nodes, edges } = buildWorkflowGraph(pipeline, workflowData, workflow.id);
      onGraphReady(workflow.id, nodes, edges);
    }
  }, [pipeline, workflow, workflowData, onGraphReady]);

  return null;
};

export default WorkflowGraph;
