import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  type Node,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Loader2 } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const { data: parentWorkflow } = useWorkflow(workflowId);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<StateNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();
  const hasInitializedRef = useRef(false);

  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const graphDataRef = useRef<Map<string, { nodes: Node<StateNodeData>[]; edges: Edge[] }>>(new Map());

  const isLoading = Object.values(loadingStates).some((l) => l);

  const handleLoadingChange = useCallback((childWorkflowId: string, loading: boolean) => {
    setLoadingStates((prev) => {
      if (prev[childWorkflowId] === loading) return prev;
      return { ...prev, [childWorkflowId]: loading };
    });
  }, []);

  const handleGraphReady = useCallback(
    (childWorkflowId: string, newNodes: Node<StateNodeData>[], newEdges: Edge[]) => {
      const workflowIndex = workflows.findIndex((w) => w.id === childWorkflowId);
      const yOffset = workflowIndex * 250;

      const offsetNodes = newNodes.map((n) => ({
        ...n,
        position: { ...n.position, y: n.position.y + yOffset },
      }));

      graphDataRef.current.set(childWorkflowId, { nodes: offsetNodes, edges: newEdges });

      const allNodes: Node<StateNodeData>[] = [];
      const allEdges: Edge[] = [];

      graphDataRef.current.forEach(({ nodes: n, edges: e }) => {
        allNodes.push(...n);
        allEdges.push(...e);
      });

      setNodes(allNodes);
      setEdges(allEdges);
    },
    [workflows, setNodes, setEdges],
  );

  useEffect(() => {
    if (!isLoading && nodes.length > 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const timer = setTimeout(() => {
        void fitView({ padding: 0.2 });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isLoading, nodes.length, fitView]);

  if (isLoading && nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      {parentWorkflow &&
        workflows.map((childWorkflow) => (
          <WorkflowGraph
            key={childWorkflow.id}
            parentWorkflow={parentWorkflow}
            workflow={childWorkflow}
            workflowConfig={workflowConfig}
            onGraphReady={handleGraphReady}
            onLoadingChange={handleLoadingChange}
            direction={direction}
          />
        ))}

      {nodes.length === 0 ? (
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
          <Background variant={BackgroundVariant.Cross} gap={24} size={1} className="opacity-[0.15]" />
          <Controls className="bg-card border-border rounded-lg border shadow-md" />
        </ReactFlow>
      )}
    </div>
  );
};

export default WorkflowFlowViewer;
