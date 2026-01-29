import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getSmoothStepPath } from '@xyflow/react';
import { Wrench } from 'lucide-react';
import React from 'react';
import { formatCondition } from '../../lib/flow-utils.ts';

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
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const {
    isExecuted,
    call,
    condition,
    id: transitionId,
    forceVisible,
  } = data as {
    isExecuted?: boolean;
    call?: { tool: string }[];
    condition?: string;
    id: string;
    forceVisible?: boolean;
  };

  const formattedCondition = condition ? formatCondition(condition) : null;
  const tools = call?.map((c) => c.tool).join(', ');

  const showLabel = transitionId || tools || formattedCondition;

  if (!showLabel) {
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
                <span className="font-mono font-medium max-w-[150px] truncate">{tools}</span>
              </div>
            )}

            {formattedCondition && (
              <span className="max-w-[150px] truncate text-[8px] opacity-70 font-mono tracking-tighter">
                {formattedCondition}
              </span>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default WorkflowTransitionEdge;
