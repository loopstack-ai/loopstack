import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import { Wrench } from 'lucide-react';
import React from 'react';
import { resolveEdgePath } from '../../lib/edge-paths.ts';
import type { TransitionEdgeData } from '../../lib/flow-types.ts';
import { formatCondition } from '../../lib/flow-utils.ts';

interface TransitionLabelProps {
  transitionId: string;
  tools?: string;
  condition?: string | null;
  isExecuted: boolean;
  forceVisible: boolean;
}

const TransitionLabel: React.FC<TransitionLabelProps> = ({
  transitionId,
  tools,
  condition,
  isExecuted,
  forceVisible,
}) => (
  <div
    className={`flex flex-col items-center gap-0.5 rounded-full border px-2 py-0.5 shadow-sm transition-all hover:z-50 hover:scale-105 bg-background/95 backdrop-blur-[2px] text-muted-foreground border-border/40 hover:border-border/80 ${
      isExecuted || forceVisible ? 'opacity-100' : 'opacity-60 hover:opacity-100'
    }`}
  >
    <span className="text-[10px] font-semibold leading-tight tracking-tight">{transitionId}</span>

    {tools && (
      <div
        className={`flex items-center gap-1 rounded-full px-1.5 py-[1px] text-[9px] ${
          isExecuted ? 'bg-primary/5 text-primary' : 'bg-muted/50 text-muted-foreground'
        }`}
      >
        <Wrench className="h-2.5 w-2.5 opacity-70" />
        <span className="max-w-[150px] truncate font-mono font-medium">{tools}</span>
      </div>
    )}

    {condition && (
      <span className="max-w-[150px] truncate font-mono text-[8px] tracking-tighter opacity-70">{condition}</span>
    )}
  </div>
);

const WorkflowTransitionEdge: React.FC<EdgeProps> = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) => {
  const {
    id: transitionId,
    isExecuted = false,
    isSelfLoop = false,
    isBackEdge = false,
    forceVisible = false,
    call,
    condition,
  } = (data ?? {}) as Partial<TransitionEdgeData>;

  const {
    path: edgePath,
    labelX,
    labelY,
  } = resolveEdgePath(
    { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition },
    { isSelfLoop, isBackEdge },
  );

  const formattedCondition = condition ? formatCondition(condition) : null;
  const tools = call?.map((c) => c.tool).join(', ');
  const hasLabel = transitionId || tools || formattedCondition;

  if (!hasLabel) {
    return <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />;
  }

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <TransitionLabel
            transitionId={transitionId ?? ''}
            tools={tools}
            condition={formattedCondition}
            isExecuted={isExecuted}
            forceVisible={forceVisible}
          />
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default WorkflowTransitionEdge;
