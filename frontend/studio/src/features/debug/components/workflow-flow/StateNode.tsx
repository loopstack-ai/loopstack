import { Handle, type Node, type NodeProps, Position } from '@xyflow/react';
import React from 'react';
import { Badge } from '@/components/ui/badge.tsx';
import type { StateNodeData } from '@/features/debug/lib/flow-types.ts';
import { cn } from '@/lib/utils.ts';

export type { StateNodeData } from '@/features/debug/lib/flow-types.ts';

export const BACK_EDGE_SOURCE_HANDLE = 'bottom-source';
export const BACK_EDGE_TARGET_HANDLE = 'bottom-target';

const HIDDEN_HANDLE = '!bg-muted-foreground/30 !h-3 !w-1 !rounded-sm opacity-0';
const HIDDEN_HANDLE_WIDE = '!bg-muted-foreground/30 !h-1 !w-3 !rounded-sm opacity-0';

function getNodeClassName(data: StateNodeData): string {
  if (data.isCurrent) return 'border-primary shadow-primary/20 bg-primary/5 ring-primary/30 z-10 shadow-lg ring-4';
  if (data.isEnd) return 'border-green-500/30 bg-green-500/10';
  if (data.isStart) return 'border-blue-500/30 bg-blue-500/10';
  if (data.isVisited) return 'border-border/60 bg-muted/40';
  return `border-border/40 bg-card/60 ${data.forceVisible ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`;
}

function getLabelClassName(data: StateNodeData): string {
  if (data.isCurrent) return 'text-primary font-semibold';
  if (data.isVisited) return 'text-foreground';
  return 'text-muted-foreground';
}

function getPositions(direction: 'LR' | 'TB') {
  const isLR = direction === 'LR';
  return {
    target: isLR ? Position.Left : Position.Top,
    source: isLR ? Position.Right : Position.Bottom,
    backEdge: isLR ? Position.Bottom : Position.Right,
  };
}

const StateNode: React.FC<NodeProps<Node<StateNodeData>>> = ({ data }) => {
  const pos = getPositions(data.direction);

  return (
    <div
      className={cn(
        'relative flex min-w-32 flex-col items-center gap-2 rounded-xl border px-5 py-3 shadow-sm transition-all duration-300',
        getNodeClassName(data),
      )}
    >
      {data.isCurrent && <CurrentIndicator />}

      <Handle type="target" position={pos.target} className={HIDDEN_HANDLE} />
      <Handle type="source" position={pos.source} className={HIDDEN_HANDLE} />
      <Handle type="source" id={BACK_EDGE_SOURCE_HANDLE} position={pos.backEdge} className={HIDDEN_HANDLE_WIDE} />
      <Handle type="target" id={BACK_EDGE_TARGET_HANDLE} position={pos.backEdge} className={HIDDEN_HANDLE_WIDE} />

      <span className={cn('text-sm font-medium tracking-tight', getLabelClassName(data))}>{data.label}</span>

      <StatusBadges data={data} />
    </div>
  );
};

const CurrentIndicator: React.FC = () => (
  <span className="absolute -top-1 -right-1 flex h-3 w-3">
    <span className="bg-primary/50 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
    <span className="bg-primary relative inline-flex h-3 w-3 rounded-full" />
  </span>
);

const StatusBadges: React.FC<{ data: StateNodeData }> = ({ data }) => (
  <div className="flex items-center gap-1.5">
    {data.visitCount > 1 && (
      <Badge
        variant="secondary"
        className="bg-secondary/50 text-secondary-foreground hover:bg-secondary/70 h-5 px-1.5 text-[10px]"
      >
        {data.visitCount}x
      </Badge>
    )}
    {data.isEnd && (
      <Badge variant="outline" className="h-5 border-green-500/30 bg-green-500/5 px-1.5 text-[10px] text-green-600">
        End
      </Badge>
    )}
    {data.isStart && (
      <Badge variant="outline" className="h-5 border-blue-500/30 bg-blue-500/5 px-1.5 text-[10px] text-blue-600">
        Start
      </Badge>
    )}
  </div>
);

export default StateNode;
