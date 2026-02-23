import type { Position } from '@xyflow/react';

export type FlowDirection = 'LR' | 'TB';

export const NODE_WIDTH = 130;
export const NODE_HEIGHT = 70;

export interface ResolvedTransition {
  id: string;
  from: string;
  to: string;
  condition?: string;
  trigger?: string;
  call?: { tool: string }[];
}

export interface StateNodeData extends Record<string, unknown> {
  label: string;
  isStart: boolean;
  isEnd: boolean;
  isCurrent: boolean;
  isVisited: boolean;
  visitCount: number;
  direction: FlowDirection;
  forceVisible?: boolean;
}

export interface TransitionEdgeData extends Record<string, unknown> {
  id: string;
  from: string;
  to: string;
  isExecuted: boolean;
  isSelfLoop: boolean;
  isBackEdge: boolean;
  forceVisible: boolean;
  condition?: string;
  trigger?: string;
  call?: { tool: string }[];
}

export interface EdgePathResult {
  path: string;
  labelX: number;
  labelY: number;
}

export interface EdgePathInput {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
}
