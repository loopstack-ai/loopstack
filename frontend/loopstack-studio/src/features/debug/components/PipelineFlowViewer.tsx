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
import type { PipelineConfigDto, WorkflowItemDto } from '@loopstack/api-client';
import { usePipeline } from '@/hooks/usePipelines.ts';
import StateNode, { type StateNodeData } from './pipeline-flow/StateNode.tsx';
import WorkflowGraph from './pipeline-flow/WorkflowGraph.tsx';

const nodeTypes = {
  stateNode: StateNode,
};

interface PipelineFlowViewerProps {
  pipelineId: string;
  workflows: WorkflowItemDto[];
  pipelineConfig?: PipelineConfigDto;
  animationsEnabled: boolean;
}

const PipelineFlowViewer: React.FC<PipelineFlowViewerProps> = ({
  pipelineId,
  workflows,
  pipelineConfig,
  animationsEnabled,
}) => {
  const { data: pipeline } = usePipeline(pipelineId);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<StateNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();
  const hasInitializedRef = useRef(false);

  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const graphDataRef = useRef<Map<string, { nodes: Node<StateNodeData>[]; edges: Edge[] }>>(new Map());

  const isLoading = Object.values(loadingStates).some((l) => l);

  const handleLoadingChange = useCallback((workflowId: string, loading: boolean) => {
    setLoadingStates((prev) => {
      if (prev[workflowId] === loading) return prev;
      return { ...prev, [workflowId]: loading };
    });
  }, []);

  const handleGraphReady = useCallback(
    (workflowId: string, newNodes: Node<StateNodeData>[], newEdges: Edge[]) => {
      const workflowIndex = workflows.findIndex((w) => w.id === workflowId);
      const yOffset = workflowIndex * 250;

      const offsetNodes = newNodes.map((n) => ({
        ...n,
        position: { ...n.position, y: n.position.y + yOffset },
      }));

      graphDataRef.current.set(workflowId, { nodes: offsetNodes, edges: newEdges });

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
      const timer = setTimeout(() => void fitView({ padding: 0.2 }), 150);
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
      {pipeline &&
        workflows.map((workflow) => (
          <WorkflowGraph
            key={workflow.id}
            pipeline={pipeline}
            workflow={workflow}
            pipelineConfig={pipelineConfig}
            onGraphReady={handleGraphReady}
            onLoadingChange={handleLoadingChange}
            animationsEnabled={animationsEnabled}
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

export default PipelineFlowViewer;
