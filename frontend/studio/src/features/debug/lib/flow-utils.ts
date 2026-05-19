import Dagre from '@dagrejs/dagre';
import { type Edge, MarkerType, type Node, Position } from '@xyflow/react';
import type { WorkflowInterface, WorkflowTransitionType } from '@loopstack/contracts/types';
import type { WorkflowCheckpoint } from '@/api/workflows.ts';
import type {
  BuildWorkflowGraphOptions,
  FlowDirection,
  ResolvedTransition,
  StateNodeData,
  TransitionEdgeData,
} from './flow-types.ts';
import { NODE_HEIGHT, NODE_WIDTH } from './flow-types.ts';

export type { BuildWorkflowGraphOptions, StateNodeData } from './flow-types.ts';

const CONDITION_OPERATORS: Record<string, string> = {
  gt: '>',
  lt: '<',
  eq: '==',
  ne: '!=',
  ge: '>=',
  le: '<=',
};

// Checkpoint-based history entry (from WorkflowCheckpointEntity)
type CheckpointEntry = WorkflowCheckpoint;

export function getLayoutedElements(
  nodes: Node<StateNodeData>[],
  edges: Edge[],
  direction: FlowDirection = 'LR',
): { nodes: Node<StateNodeData>[]; edges: Edge[] } {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 120, ranksep: 240 });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  Dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id) as Dagre.Node;
    return {
      ...node,
      targetPosition: direction === 'LR' ? Position.Left : Position.Top,
      sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
    };
  });

  return { nodes: layoutedNodes, edges };
}

interface TransitionContainer {
  transitions?: WorkflowTransitionType[];
  definition?: TransitionContainer;
  specification?: TransitionContainer;
  [key: string]: unknown;
}

export function getTransitions(obj: unknown, seen = new Set<unknown>()): WorkflowTransitionType[] {
  if (!obj || typeof obj !== 'object' || seen.has(obj)) return [];
  try {
    seen.add(obj);
  } catch {
    return [];
  }

  const container = obj as TransitionContainer;

  if (Array.isArray(container.transitions)) return container.transitions;
  if (container.definition) {
    const result = getTransitions(container.definition, seen);
    if (result.length > 0) return result;
  }
  if (container.specification) {
    const result = getTransitions(container.specification, seen);
    if (result.length > 0) return result;
  }

  for (const key in container) {
    if (key === 'history' || key === 'data') continue;
    const val = container[key];
    if (val && typeof val === 'object') {
      const result = getTransitions(val, seen);
      if (result.length > 0) return result;
    } else if (typeof val === 'string' && val.includes('"transitions":')) {
      try {
        const result = getTransitions(JSON.parse(val) as unknown, seen);
        if (result.length > 0) return result;
      } catch {
        // Skip malformed JSON
      }
    }
  }

  return [];
}

export function formatCondition(condition: string): string {
  if (!condition) return '';
  const clean = condition.replace(/\{\{|\}\}/g, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length === 3) {
    const [op, left, right] = parts;
    const symbol = CONDITION_OPERATORS[op];
    if (symbol) return `${left} ${symbol} ${right}`;
  }
  return clean;
}

export function buildWorkflowGraph(
  parentWorkflow: unknown,
  workflowData: WorkflowInterface | undefined,
  workflowId: string,
  configTransitions: WorkflowTransitionType[] = [],
  direction: FlowDirection,
  forceVisible = false,
  checkpoints: CheckpointEntry[] = [],
  options?: BuildWorkflowGraphOptions,
): { nodes: Node<StateNodeData>[]; edges: Edge[] } {
  const transitions = collectTransitions(
    parentWorkflow,
    workflowData,
    configTransitions,
    options?.extraTransitionSources,
  );

  const states = collectStates(transitions, checkpoints);
  const executedMap = buildExecutedMap(checkpoints);

  const allTransitions = resolveTransitions(transitions, checkpoints);
  const endStates = findEndStates(states, allTransitions);
  const visitedStates = findVisitedStates(checkpoints);

  const nodes = buildNodes(states, {
    workflowId,
    currentPlace: workflowData?.place,
    endStates,
    visitedStates,
    visitCounts: buildVisitCounts(checkpoints),
    direction,
    forceVisible,
  });

  const edges = buildEdges(allTransitions, {
    workflowId,
    executedMap,
    forceVisible,
    hideSameStateTransitions: options?.hideSameStateTransitions ?? false,
    direction,
  });

  if (nodes.length <= 1) {
    return { nodes, edges };
  }

  return getLayoutedElements(nodes, edges, direction);
}

function collectTransitions(
  parentWorkflow: unknown,
  workflowData: WorkflowInterface | undefined,
  configTransitions: WorkflowTransitionType[],
  extraSources: unknown[] | undefined,
): WorkflowTransitionType[] {
  const all = [...configTransitions];
  if (parentWorkflow) all.push(...getTransitions(parentWorkflow));
  if (workflowData) all.push(...getTransitions(workflowData));
  for (const src of extraSources ?? []) {
    all.push(...getTransitions(src));
  }

  const seen = new Set<string>();
  return all.filter((t) => {
    const fromStr = Array.isArray(t.from) ? t.from.join(',') : t.from;
    const key = `${t.id}-${fromStr}-${t.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectStates(transitions: WorkflowTransitionType[], checkpoints: CheckpointEntry[]): Set<string> {
  const states = new Set<string>(['start']);

  for (const t of transitions) {
    const fromStates = Array.isArray(t.from) ? t.from : [t.from];
    for (const f of fromStates) states.add(f ?? 'start');
    states.add(t.to);
  }

  for (const entry of checkpoints) {
    if (entry.place) states.add(entry.place);
    if (entry.transitionFrom) states.add(entry.transitionFrom);
  }

  return states;
}

function buildVisitCounts(checkpoints: CheckpointEntry[]): Map<string, number> {
  const counts = new Map<string, number>([['start', 1]]);
  for (const entry of checkpoints) {
    if (entry.place) counts.set(entry.place, (counts.get(entry.place) ?? 0) + 1);
  }
  return counts;
}

function buildExecutedMap(checkpoints: CheckpointEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of checkpoints) {
    if (!entry.transitionId) continue;
    const from = entry.transitionFrom ?? 'start';
    const key = `${from}->${entry.place}:${entry.transitionId}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function resolveTransitions(
  definitions: WorkflowTransitionType[],
  checkpoints: CheckpointEntry[],
): ResolvedTransition[] {
  const result: ResolvedTransition[] = [];

  for (const t of definitions) {
    const fromStates = Array.isArray(t.from) ? t.from : [t.from];
    const withCondition = t as WorkflowTransitionType & { if?: string; condition?: string };
    for (const fromState of fromStates) {
      result.push({
        id: t.id,
        from: fromState ?? 'start',
        to: t.to,
        condition: withCondition.if ?? withCondition.condition,
        trigger: t.trigger,
        call: t.call,
      });
    }
  }

  for (const entry of checkpoints) {
    if (!entry.transitionId) continue;
    const from = entry.transitionFrom ?? 'start';
    const exists = result.some((r) => r.from === from && r.to === entry.place && r.id === entry.transitionId);
    if (!exists) {
      result.push({ id: entry.transitionId, from, to: entry.place });
    }
  }

  return result;
}

function findEndStates(states: Set<string>, transitions: ResolvedTransition[]): Set<string> {
  const withOutgoing = new Set(transitions.map((t) => t.from));
  const ends = new Set<string>();
  for (const s of states) {
    if (!withOutgoing.has(s) && s !== 'start') ends.add(s);
  }
  return ends;
}

function findVisitedStates(checkpoints: CheckpointEntry[]): Set<string> {
  const visited = new Set<string>(['start']);
  for (const entry of checkpoints) {
    if (entry.place) visited.add(entry.place);
  }
  return visited;
}

interface NodeBuildContext {
  workflowId: string;
  currentPlace: string | undefined;
  endStates: Set<string>;
  visitedStates: Set<string>;
  visitCounts: Map<string, number>;
  direction: FlowDirection;
  forceVisible: boolean;
}

function buildNodes(states: Set<string>, ctx: NodeBuildContext): Node<StateNodeData>[] {
  return Array.from(states).map((state) => ({
    id: `${ctx.workflowId}-${state}`,
    type: 'stateNode',
    position: { x: 0, y: 0 },
    data: {
      label: state,
      isStart: state === 'start',
      isEnd: ctx.endStates.has(state),
      isCurrent: state === ctx.currentPlace,
      isVisited: ctx.visitedStates.has(state),
      visitCount: ctx.visitCounts.get(state) ?? 0,
      direction: ctx.direction,
      forceVisible: ctx.forceVisible,
    },
  }));
}

interface EdgeBuildContext {
  workflowId: string;
  executedMap: Map<string, number>;
  forceVisible: boolean;
  hideSameStateTransitions: boolean;
  direction: FlowDirection;
}

function edgeHandleProps(
  direction: FlowDirection,
  isSelfLoop: boolean,
): {
  sourceHandle?: string;
  targetHandle?: string;
} {
  if (direction === 'TB') {
    return isSelfLoop
      ? { sourceHandle: 'tb-s-self', targetHandle: 'tb-t-self' }
      : { sourceHandle: 'tb-s', targetHandle: 'tb-t' };
  }
  return isSelfLoop
    ? { sourceHandle: 'lr-r-self', targetHandle: 'lr-l-self' }
    : { sourceHandle: 'lr-r', targetHandle: 'lr-l' };
}

function buildEdges(transitions: ResolvedTransition[], ctx: EdgeBuildContext): Edge[] {
  const seen = new Set<string>();
  const edges: Edge[] = [];
  let index = 0;

  for (const t of transitions) {
    const key = `${t.from}->${t.to}:${t.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const isSelfLoop = t.from === t.to;
    if (ctx.hideSameStateTransitions && isSelfLoop) continue;

    const isExecuted = ctx.executedMap.has(key);
    const isAutomatic = t.trigger === 'onEntry';

    const color = isExecuted ? 'var(--primary)' : 'var(--muted-foreground)';

    const data: TransitionEdgeData = {
      ...t,
      isExecuted,
      isSelfLoop,
      forceVisible: ctx.forceVisible,
    };

    const baseOpacity = isExecuted || ctx.forceVisible ? 1 : 0.38;
    const baseStrokeWidth = isExecuted ? 2.5 : 1.5;

    edges.push({
      id: `edge-${ctx.workflowId}-${index++}`,
      source: `${ctx.workflowId}-${t.from}`,
      target: `${ctx.workflowId}-${t.to}`,
      ...edgeHandleProps(ctx.direction, isSelfLoop),
      type: 'workflowTransition',
      animated: false,
      style: {
        strokeWidth: baseStrokeWidth,
        stroke: color,
        strokeDasharray: isAutomatic ? '4,4' : !isExecuted ? '5,5' : undefined,
        opacity: baseOpacity,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: isSelfLoop ? 12 : 18,
        height: isSelfLoop ? 12 : 18,
        color,
      },
      data,
    });
  }

  return edges;
}
