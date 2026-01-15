import React from 'react';
import { Handle, type Node, type NodeProps, Position } from '@xyflow/react';
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
};

const StateNode: React.FC<NodeProps<Node<StateNodeData>>> = ({ data }) => {
  return (
    <div
      className={cn(
        'relative flex min-w-28 flex-col items-center gap-1 rounded-lg border-2 px-4 py-3 shadow-md transition-all',
        data.isCurrent
          ? 'border-primary bg-primary/10 shadow-primary/30 ring-primary/20 shadow-lg ring-4'
          : data.isEnd
            ? 'border-green-500/60 bg-green-500/5'
            : data.isStart
              ? 'border-blue-500/60 bg-blue-500/5'
              : data.isVisited
                ? 'border-muted-foreground/40 bg-muted/30'
                : 'border-border bg-card',
      )}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <span
        className={cn(
          'text-sm font-semibold',
          data.isCurrent ? 'text-primary' : data.isVisited ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {data.label}
      </span>
      <div className="flex items-center gap-1">
        {data.visitCount > 1 && (
          <Badge variant="secondary" className="text-[9px]">
            ×{data.visitCount}
          </Badge>
        )}
        {data.isEnd && (
          <Badge variant="outline" className="border-green-500/50 text-[9px] text-green-600">
            end
          </Badge>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
};

export default StateNode;
