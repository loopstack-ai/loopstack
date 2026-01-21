import Dagre from '@dagrejs/dagre';
import { type Edge, MarkerType, type Node, Position } from '@xyflow/react';
import type { WorkflowInterface, WorkflowTransitionType } from '@loopstack/contracts/types';
import type { StateNodeData } from '../components/pipeline-flow/StateNode.tsx';

export interface HistoryTransitionMetadata {
  place: string;
  tools: Record<string, Record<string, unknown>>;
  transition?: {
    transition: string;
    from: string | null;
    to: string;
  };
}

export interface HistoryTransition {
  data: Record<string, unknown>;
  version: number;
  metadata: HistoryTransitionMetadata;
  timestamp: string;
}

export function getLayoutedElements(
  nodes: Node<StateNodeData>[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'LR',
): { nodes: Node<StateNodeData>[]; edges: Edge[] } {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 100, ranksep: 200 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 130, height: 70 });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  Dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      targetPosition: direction === 'LR' ? Position.Left : Position.Top,
      sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - 65,
        y: nodeWithPosition.y - 35,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

export function getTransitions(obj: any, seen = new Set()): WorkflowTransitionType[] {
  if (!obj || typeof obj !== 'object' || seen.has(obj)) return [];

  try {
    seen.add(obj);
  } catch {
    return [];
  }

  if (Array.isArray(obj.transitions)) return obj.transitions;

  if (obj.definition) {
    const fromDef = getTransitions(obj.definition, seen);
    if (fromDef.length > 0) return fromDef;
  }
  if (obj.specification) {
    const fromSpec = getTransitions(obj.specification, seen);
    if (fromSpec.length > 0) return fromSpec;
  }

  for (const key in obj) {
    if (key === 'history' || key === 'data') continue;

    const val = obj[key];
    if (val && typeof val === 'object') {
      const found = getTransitions(val, seen);
      if (found.length > 0) return found;
    } else if (typeof val === 'string' && val.includes('"transitions":')) {
      try {
        const parsed = JSON.parse(val);
        const found = getTransitions(parsed, seen);
        if (found.length > 0) return found;
      } catch {
        console.error('Failed to parse transitions', val);
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
    const map: Record<string, string> = {
      gt: '>',
      lt: '<',
      eq: '==',
      ne: '!=',
      ge: '>=',
      le: '<=',
    };
    if (map[op]) {
      return `${left} ${map[op]} ${right}`;
    }
  }

  return clean;
}

export function buildWorkflowGraph(
  pipeline: any,
  workflowData: WorkflowInterface | undefined,
  workflowId: string,
  configTransitions: WorkflowTransitionType[] = [],
  animationsEnabled: boolean = true,
): { nodes: Node<StateNodeData>[]; edges: Edge[] } {
  let transitionsInDefinition: WorkflowTransitionType[] = [];

  if (configTransitions.length > 0) {
    transitionsInDefinition.push(...configTransitions);
  }

  if (pipeline) {
    transitionsInDefinition.push(...getTransitions(pipeline));
  }

  if (workflowData) {
    transitionsInDefinition.push(...getTransitions(workflowData));
  }

  const seenTransitions = new Set<string>();
  transitionsInDefinition = transitionsInDefinition.filter((t) => {
    const key = `${t.id}-${t.from}-${t.to}`;
    if (seenTransitions.has(key)) return false;
    seenTransitions.add(key);
    return true;
  });

  const history = (workflowData?.history ?? []) as unknown as HistoryTransition[];
  const currentPlace = workflowData?.place ?? 'start';

  const statesSet = new Set<string>();
  statesSet.add('start');

  const stateVisitCount = new Map<string, number>();
  stateVisitCount.set('start', 1);

  const executedTransitions = new Map<string, { from: string; to: string; count: number }>();

  history.forEach((entry) => {
    const place = entry.metadata?.place;
    const transition = entry.metadata?.transition;

    if (place) {
      statesSet.add(place);
      stateVisitCount.set(place, (stateVisitCount.get(place) ?? 0) + 1);
    }

    if (transition) {
      const from = transition.from ?? 'start';
      const to = transition.to;
      const transitionId = transition.transition;

      statesSet.add(from);
      statesSet.add(to);

      const key = `${from}->${to}:${transitionId}`;
      const existing = executedTransitions.get(key);
      if (existing) {
        existing.count++;
      } else {
        executedTransitions.set(key, { from, to, count: 1 });
      }
    }
  });

  const allTransitions: { id: string; from: string; to: string; condition?: string; trigger?: string }[] = [];

  transitionsInDefinition.forEach((t) => {
    const fromStates = Array.isArray(t.from) ? t.from : [t.from];
    fromStates.forEach((fromState) => {
      statesSet.add(fromState);
      statesSet.add(t.to);
      allTransitions.push({
        id: t.id,
        from: fromState,
        to: t.to,
        condition: (t as any).if || (t as any).condition,
        trigger: t.trigger,
      });
    });
  });

  history.forEach((entry) => {
    const transition = entry.metadata?.transition;
    if (transition && transition.transition) {
      const from = transition.from ?? 'start';
      const exists = allTransitions.some(
        (t) => t.from === from && t.to === transition.to && t.id === transition.transition,
      );
      if (!exists) {
        allTransitions.push({
          id: transition.transition,
          from,
          to: transition.to,
        });
      }
    }
  });

  const statesWithOutgoing = new Set<string>();
  allTransitions.forEach((t) => statesWithOutgoing.add(t.from));

  const endStates = new Set<string>();
  statesSet.forEach((s) => {
    if (!statesWithOutgoing.has(s) && s !== 'start') {
      endStates.add(s);
    }
  });

  const visitedStates = new Set<string>();
  visitedStates.add('start');
  history.forEach((entry) => {
    const place = entry.metadata?.place;
    if (place) visitedStates.add(place);
    const to = entry.metadata?.transition?.to;
    if (to) visitedStates.add(to);
  });

  const nodes: Node<StateNodeData>[] = Array.from(statesSet).map((state) => ({
    id: `${workflowId}-${state}`,
    type: 'stateNode',
    position: { x: 0, y: 0 },
    data: {
      label: state,
      isStart: state === 'start',
      isEnd: endStates.has(state),
      isCurrent: state === currentPlace,
      isVisited: visitedStates.has(state),
      visitCount: stateVisitCount.get(state) ?? 0,
      animationsEnabled,
    },
  }));

  const edgeMap = new Map<string, Edge>();
  let edgeIndex = 0;

  allTransitions.forEach((t) => {
    const edgeKey = `${t.from}->${t.to}:${t.id}`;
    if (edgeMap.has(edgeKey)) return;

    const executedInfo = executedTransitions.get(edgeKey);
    const isExecuted = !!executedInfo;
    const isAutomatic = t.trigger === 'onEntry';

    let edgeLabel = t.id;
    if (t.condition) {
      const formatted = formatCondition(t.condition);
      const displayCond = formatted.length > 30 ? formatted.substring(0, 27) + '...' : formatted;
      edgeLabel = `${t.id}\n[if ${displayCond}]`;
    }

    edgeMap.set(edgeKey, {
      id: `edge-${workflowId}-${edgeIndex++}`,
      source: `${workflowId}-${t.from}`,
      target: `${workflowId}-${t.to}`,
      type: 'smoothstep',
      animated: isExecuted && animationsEnabled,
      label: edgeLabel,
      style: {
        strokeWidth: isExecuted ? 2.5 : 1.5,
        stroke: isExecuted ? 'var(--primary)' : 'var(--muted-foreground)',
        strokeDasharray: isAutomatic ? '4,4' : !isExecuted ? '5,5' : undefined,
        opacity: isExecuted ? 1 : 0.3,
      },
      labelStyle: {
        fill: isExecuted ? 'var(--primary)' : 'var(--muted-foreground)',
        fontWeight: isExecuted ? 600 : 500,
        fontSize: '11px',
        opacity: isExecuted ? 1 : 0.7,
      },
      labelBgStyle: {
        fill: 'var(--background)',
        opacity: 0.8,
      },
      labelBgPadding: [4, 2],
      labelShowBg: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        color: isExecuted ? 'var(--primary)' : 'var(--muted-foreground)',
      },
      data: { isExecuted, ...t },
    });
  });

  const edges = Array.from(edgeMap.values());

  if (nodes.length > 1) {
    return getLayoutedElements(nodes, edges);
  }

  return { nodes, edges };
}
