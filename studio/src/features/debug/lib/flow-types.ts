import type { Position } from '@xyflow/react';

export type FlowDirection = 'LR' | 'TB';

export interface BuildWorkflowGraphOptions {
  hideSameStateTransitions?: boolean;
  extraTransitionSources?: unknown[];
}

export const NODE_WIDTH = 208;
export const NODE_HEIGHT = 104;

/**
 * Transition shape the graph builder accepts.
 *
 * Covers both sources it renders: the serialized transitions the API returns
 * (`WorkflowTransitionType` — `guard` names the gating method), and the legacy
 * YAML workflow configs the code explorer previews, which are parsed as-is and may
 * carry arbitrary `if` / `condition` / `call` keys. Deliberately local to Studio:
 * `@loopstack/contracts` describes only what the engine emits.
 */
export interface GraphTransitionInput {
  id: string;
  from: string | string[];
  to: string;
  trigger?: string;
  guard?: string;
  /** Legacy YAML config preview only. */
  if?: unknown;
  /** Legacy YAML config preview only. */
  condition?: unknown;
  /** Legacy YAML config preview only. */
  call?: { tool: string }[];
}

export interface ResolvedTransition {
  id: string;
  from: string;
  to: string;
  guard?: string;
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
  forceVisible: boolean;
  guard?: string;
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
