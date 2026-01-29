import { Handle, type Node, type NodeProps, Position } from '@xyflow/react';
import React from 'react';
import { Badge } from '@/components/ui/badge.tsx';
import { cn } from '@/lib/utils.ts';

export type StateNodeData = {
  label: string;
  isStart: boolean;
  isEnd: boolean;
  isCurrent: boolean;
  isVisited: boolean;
  visitCount: number;
  [key: string]: unknown;
  direction: 'LR' | 'TB';
  forceVisible?: boolean;
};

const StateNode: React.FC<NodeProps<Node<StateNodeData>>> = ({ data }) => {
  return (
    <div
      className={cn(
        'relative flex min-w-32 flex-col items-center gap-2 rounded-xl border px-5 py-3 shadow-sm transition-all duration-300',
        data.isCurrent
          ? 'border-primary shadow-primary/20 bg-primary/5 ring-primary/30 z-10 shadow-lg ring-4'
          : data.isEnd
            ? 'border-green-500/30 bg-green-500/10'
            : data.isStart
              ? 'border-blue-500/30 bg-blue-500/10'
              : data.isVisited
                ? 'border-border/60 bg-muted/40'
                : `border-border/40 bg-card/60 ${data.forceVisible ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`,
      )}
    >
      {data.isCurrent && (
        <>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="bg-primary/50 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
            <span className="bg-primary relative inline-flex h-3 w-3 rounded-full"></span>
          </span>
        </>
      )}

      <Handle
        type="target"
        position={data.direction === 'LR' ? Position.Left : Position.Top}
        className="!bg-muted-foreground/30 !h-3 !w-1 !rounded-sm opacity-0"
      />

      <span
        className={cn(
          'text-sm font-medium tracking-tight',
          data.isCurrent ? 'text-primary font-semibold' : data.isVisited ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {data.label}
      </span>

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
      <Handle
        type="source"
        position={data.direction === 'LR' ? Position.Right : Position.Bottom}
        className="!bg-muted-foreground/30 !h-3 !w-1 !rounded-sm opacity-0"
      />
    </div>
  );
};

export default StateNode;
