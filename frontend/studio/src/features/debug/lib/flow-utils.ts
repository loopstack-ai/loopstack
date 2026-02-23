import Dagre from '@dagrejs/dagre';
import { type Edge, MarkerType, type Node, Position } from '@xyflow/react';
import type { WorkflowInterface, WorkflowTransitionType } from '@loopstack/contracts/types';
import type { FlowDirection, ResolvedTransition, StateNodeData, TransitionEdgeData } from './flow-types.ts';

export type { StateNodeData } from './flow-types.ts';

const NODE_WIDTH = 130;
const NODE_HEIGHT = 70;

const CONDITION_OPERATORS: Record<string, string> = {
  gt: '>',
  lt: '<',
  eq: '==',
  ne: '!=',
  ge: '>=',
  le: '<=',
};

export interface HistoryTransitionMetadata {
  place: string;
  tools: Record<string, Record<string, unknown>>;
  transition?: { id: string; from: string | null; to: string };
}

export interface HistoryTransition {
  state: Record<string, unknown>;
  version: number;
  data: HistoryTransitionMetadata;
  timestamp: string;
}

export function getLayoutedElements(
  nodes: Node<StateNodeData>[],
  edges: Edge[],
  direction: FlowDirection = 'LR',
): { nodes: Node<StateNodeData>[]; edges: Edge[] } {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 100, ranksep: 200 });

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
  pipeline: unknown,
  workflowData: WorkflowInterface | undefined,
  workflowId: string,
  configTransitions: WorkflowTransitionType[] = [],
  direction: FlowDirection,
  forceVisible = false,
): { nodes: Node<StateNodeData>[]; edges: Edge[] } {
  const transitions = collectTransitions(pipeline, workflowData, configTransitions);
  const history = extractHistory(workflowData);

  const states = collectStates(transitions, history);
  const executedMap = buildExecutedMap(history);

  const allTransitions = resolveTransitions(transitions, history);
  const endStates = findEndStates(states, allTransitions);
  const visitedStates = findVisitedStates(history);
  const stateRanks = computeStateRanks(allTransitions);

  const nodes = buildNodes(states, {
    workflowId,
    currentPlace: workflowData?.place,
    endStates,
    visitedStates,
    visitCounts: buildVisitCounts(history),
    direction,
    forceVisible,
  });

  const edges = buildEdges(allTransitions, {
    workflowId,
    executedMap,
    stateRanks,
    forceVisible,
  });

  return nodes.length > 1 ? getLayoutedElements(nodes, edges, direction) : { nodes, edges };
}

function collectTransitions(
  pipeline: unknown,
  workflowData: WorkflowInterface | undefined,
  configTransitions: WorkflowTransitionType[],
): WorkflowTransitionType[] {
  const all = [...configTransitions];
  if (pipeline) all.push(...getTransitions(pipeline));
  if (workflowData) all.push(...getTransitions(workflowData));

  const seen = new Set<string>();
  return all.filter((t) => {
    const fromStr = Array.isArray(t.from) ? t.from.join(',') : t.from;
    const key = `${t.id}-${fromStr}-${t.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractHistory(workflowData: WorkflowInterface | undefined): HistoryTransition[] {
  return (workflowData?.history ?? []) as unknown as HistoryTransition[];
}

function collectStates(transitions: WorkflowTransitionType[], history: HistoryTransition[]): Set<string> {
  const states = new Set<string>(['start']);

  for (const t of transitions) {
    const fromStates = Array.isArray(t.from) ? t.from : [t.from];
    for (const f of fromStates) states.add(f ?? 'start');
    states.add(t.to);
  }

  for (const entry of history) {
    if (entry.data?.place) states.add(entry.data.place);
    if (entry.data?.transition) {
      states.add(entry.data.transition.from ?? 'start');
      states.add(entry.data.transition.to);
    }
  }

  return states;
}

function buildVisitCounts(history: HistoryTransition[]): Map<string, number> {
  const counts = new Map<string, number>([['start', 1]]);
  for (const entry of history) {
    const place = entry.data?.place;
    if (place) counts.set(place, (counts.get(place) ?? 0) + 1);
  }
  return counts;
}

function buildExecutedMap(history: HistoryTransition[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of history) {
    const t = entry.data?.transition;
    if (!t) continue;
    const key = `${t.from ?? 'start'}->${t.to}:${t.id}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function resolveTransitions(definitions: WorkflowTransitionType[], history: HistoryTransition[]): ResolvedTransition[] {
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

  for (const entry of history) {
    const t = entry.data?.transition;
    if (!t?.id) continue;
    const from = t.from ?? 'start';
    const exists = result.some((r) => r.from === from && r.to === t.to && r.id === t.id);
    if (!exists) {
      result.push({ id: t.id, from, to: t.to });
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

function findVisitedStates(history: HistoryTransition[]): Set<string> {
  const visited = new Set<string>(['start']);
  for (const entry of history) {
    if (entry.data?.place) visited.add(entry.data.place);
    if (entry.data?.transition?.to) visited.add(entry.data.transition.to);
  }
  return visited;
}

function computeStateRanks(transitions: ResolvedTransition[]): Map<string, number> {
  const adjacency = new Map<string, string[]>();
  for (const t of transitions) {
    if (t.from === t.to) continue;
    const neighbors = adjacency.get(t.from) ?? [];
    neighbors.push(t.to);
    adjacency.set(t.from, neighbors);
  }

  const ranks = new Map<string, number>([['start', 0]]);
  const queue = ['start'];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const rank = ranks.get(current)!;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!ranks.has(neighbor)) {
        ranks.set(neighbor, rank + 1);
        queue.push(neighbor);
      }
    }
  }

  return ranks;
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
  stateRanks: Map<string, number>;
  forceVisible: boolean;
}

function buildEdges(transitions: ResolvedTransition[], ctx: EdgeBuildContext): Edge[] {
  const seen = new Set<string>();
  const edges: Edge[] = [];
  let index = 0;

  for (const t of transitions) {
    const key = `${t.from}->${t.to}:${t.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const isExecuted = ctx.executedMap.has(key);
    const isAutomatic = t.trigger === 'onEntry';
    const isSelfLoop = t.from === t.to;
    const fromRank = ctx.stateRanks.get(t.from) ?? 0;
    const toRank = ctx.stateRanks.get(t.to) ?? 0;
    const isBackEdge = !isSelfLoop && toRank <= fromRank;

    const color = isExecuted ? 'var(--primary)' : 'var(--muted-foreground)';

    const data: TransitionEdgeData = {
      ...t,
      isExecuted,
      isSelfLoop,
      isBackEdge,
      forceVisible: ctx.forceVisible,
    };

    edges.push({
      id: `edge-${ctx.workflowId}-${index++}`,
      source: `${ctx.workflowId}-${t.from}`,
      target: `${ctx.workflowId}-${t.to}`,
      ...(isBackEdge && { sourceHandle: 'bottom-source', targetHandle: 'bottom-target' }),
      type: 'workflowTransition',
      animated: false,
      style: {
        strokeWidth: isExecuted ? 2.5 : 1.5,
        stroke: color,
        strokeDasharray: isAutomatic ? '4,4' : !isExecuted ? '5,5' : undefined,
        opacity: isExecuted || ctx.forceVisible ? 1 : 0.3,
      },
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color },
      data,
    });
  }

  return edges;
}
