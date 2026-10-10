import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  type Node,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Loader2 } from 'lucide-react';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { WorkflowConfigInterface, WorkflowItemInterface } from '@loopstack/contracts/api';
import { useWorkflow } from '@/hooks/useWorkflows.ts';
import type { StateNodeData } from '../lib/flow-types.ts';
import StateNode from './workflow-flow/StateNode.tsx';
import WorkflowGraph from './workflow-flow/WorkflowGraph.tsx';
import WorkflowTransitionEdge from './workflow-flow/WorkflowTransitionEdge.tsx';

const nodeTypes = {
  stateNode: StateNode,
};

const edgeTypes = {
  workflowTransition: WorkflowTransitionEdge,
};

interface WorkflowFlowViewerProps {
  workflowId: string;
  workflows: WorkflowItemInterface[];
  workflowConfig?: WorkflowConfigInterface;
  direction?: 'LR' | 'TB';
}

const WorkflowFlowViewer: React.FC<WorkflowFlowViewerProps> = ({
  workflowId,
  workflows,
  workflowConfig,
  direction = 'LR',
}) => {
  const { data: parentWorkflow, isPending: isParentPending, isLoading: isParentLoading } = useWorkflow(workflowId);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<StateNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();
  const hasInitializedRef = useRef(false);
  const prevWorkflowIdRef = useRef(workflowId);

  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [showSameStateTransitions, setShowSameStateTransitions] = useState(true);

  const rootWorkflow = parentWorkflow as WorkflowItemInterface | undefined;

  const extraTransitionSources = useMemo(
    () => workflows.filter((w) => w.id !== workflowId) as unknown[],
    [workflows, workflowId],
  );

  const isChildGraphLoading = Object.values(loadingStates).some((l) => l);
  const isAwaitingParentWorkflow = Boolean(workflowId) && !parentWorkflow && (isParentPending || isParentLoading);
  const isLoading = isAwaitingParentWorkflow || isChildGraphLoading;

  const handleLoadingChange = useCallback((childWorkflowId: string, loading: boolean) => {
    setLoadingStates((prev: Record<string, boolean>) => {
      if (prev[childWorkflowId] === loading) return prev;
      return { ...prev, [childWorkflowId]: loading };
    });
  }, []);

  const handleGraphReady = useCallback(
    (_childWorkflowId: string, newNodes: Node<StateNodeData>[], newEdges: Edge[]) => {
      setNodes(newNodes);
      setEdges(newEdges);
    },
    [setNodes, setEdges],
  );

  useLayoutEffect(() => {
    if (prevWorkflowIdRef.current === workflowId) return;
    prevWorkflowIdRef.current = workflowId;
    hasInitializedRef.current = false;
    setNodes([]);
    setEdges([]);
  }, [workflowId, setNodes, setEdges]);

  useEffect(() => {
    if (!isLoading && nodes.length > 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const timer = setTimeout(() => {
        void fitView({ padding: 0.2 });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isLoading, nodes.length, fitView]);

  return (
    <div className="h-full w-full">
      {rootWorkflow && (
        <WorkflowGraph
          key={workflowId}
          parentWorkflow={parentWorkflow}
          workflow={rootWorkflow}
          workflowConfig={workflowConfig}
          extraTransitionSources={extraTransitionSources}
          onGraphReady={handleGraphReady}
          onLoadingChange={handleLoadingChange}
          direction={direction}
          hideSameStateTransitions={!showSameStateTransitions}
        />
      )}

      {isLoading && nodes.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : nodes.length === 0 ? (
        <div className="text-muted-foreground flex h-full items-center justify-center">
          <p className="font-medium">No workflow transitions available</p>
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          className="bg-background"
        >
          <Panel
            position="top-right"
            className="m-2 flex max-w-[min(100%,14rem)] flex-col gap-2 rounded-md border border-border/60 bg-card/95 px-2 py-2 text-xs shadow-sm backdrop-blur-sm"
          >
            <label className="flex cursor-pointer select-none items-center gap-2 text-muted-foreground">
              <input
                type="checkbox"
                className="accent-primary h-3.5 w-3.5 shrink-0 rounded border-border"
                checked={showSameStateTransitions}
                onChange={(e) => setShowSameStateTransitions(e.target.checked)}
              />
              <span>Same-state transitions</span>
            </label>
          </Panel>
          <Background variant={BackgroundVariant.Cross} gap={24} size={1} className="opacity-[0.15]" />
          <Controls className="bg-card border-border rounded-lg border shadow-md" />
        </ReactFlow>
      )}
    </div>
  );
};

export default WorkflowFlowViewer;
