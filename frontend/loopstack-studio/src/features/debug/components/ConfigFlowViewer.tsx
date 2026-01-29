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
import React, { useEffect, useRef } from 'react';
import type { PipelineConfigDto } from '@loopstack/api-client';
import type { WorkflowTransitionType } from '@loopstack/contracts/types';
import { buildWorkflowGraph } from '../lib/flow-utils.ts';
import StateNode from './pipeline-flow/StateNode.tsx';

const nodeTypes = {
  stateNode: StateNode,
};

interface ConfigFlowViewerProps {
  config: PipelineConfigDto;
}

const ConfigFlowViewer: React.FC<ConfigFlowViewerProps> = ({ config }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!config) return;

    const transitions = (config.transitions as unknown as WorkflowTransitionType[]) ?? [];

    const { nodes: newNodes, edges: newEdges } = buildWorkflowGraph(config, undefined, 'preview', transitions, 'TB');

    setNodes(newNodes);
    setEdges(newEdges);
  }, [config, setNodes, setEdges]);

  useEffect(() => {
    if (nodes.length > 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const timer = setTimeout(() => {
        void fitView({ padding: 0.2 });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [nodes.length, fitView]);

  if (!config) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center">
        <p className="font-medium">No transitions defined in configuration</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-background">
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
    </div>
  );
};

export default ConfigFlowViewer;
