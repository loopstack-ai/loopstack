import { Handle, type Node, type NodeProps, Position } from '@xyflow/react';
import React from 'react';
import { Badge } from '@/components/ui/badge.tsx';
import type { StateNodeData } from '@/features/debug/lib/flow-types.ts';
import { NODE_HEIGHT, NODE_WIDTH } from '@/features/debug/lib/flow-types.ts';
import { cn } from '@/lib/utils.ts';

export type { StateNodeData } from '@/features/debug/lib/flow-types.ts';

const HIDDEN_HANDLE = '!border-none !bg-muted-foreground/30 !h-3 !w-3 !min-h-0 !min-w-0 !rounded-sm opacity-0';

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

function TbHandles() {
  return (
    <>
      <Handle
        type="target"
        id="tb-t"
        position={Position.Top}
        className={HIDDEN_HANDLE}
        style={{ left: '50%', transform: 'translate(-50%, -50%)' }}
      />
      <Handle
        type="source"
        id="tb-s"
        position={Position.Bottom}
        className={HIDDEN_HANDLE}
        style={{ left: '50%', transform: 'translate(-50%, 50%)' }}
      />
      <Handle
        type="target"
        id="tb-t-self"
        position={Position.Top}
        className={HIDDEN_HANDLE}
        style={{ left: '78%', transform: 'translate(-50%, -50%)' }}
      />
      <Handle
        type="source"
        id="tb-s-self"
        position={Position.Bottom}
        className={HIDDEN_HANDLE}
        style={{ left: '22%', transform: 'translate(-50%, 50%)' }}
      />
    </>
  );
}

function LrHandles() {
  return (
    <>
      <Handle
        type="target"
        id="lr-l"
        position={Position.Left}
        className={HIDDEN_HANDLE}
        style={{ top: '50%', transform: 'translate(-50%, -50%)' }}
      />
      <Handle
        type="source"
        id="lr-r"
        position={Position.Right}
        className={HIDDEN_HANDLE}
        style={{ top: '50%', transform: 'translate(50%, -50%)' }}
      />
      <Handle
        type="target"
        id="lr-l-self"
        position={Position.Left}
        className={HIDDEN_HANDLE}
        style={{ top: '72%', transform: 'translate(-50%, -50%)' }}
      />
      <Handle
        type="source"
        id="lr-r-self"
        position={Position.Right}
        className={HIDDEN_HANDLE}
        style={{ top: '28%', transform: 'translate(50%, -50%)' }}
      />
    </>
  );
}

const StateNode: React.FC<NodeProps<Node<StateNodeData>>> = ({ data }) => {
  const tb = data.direction === 'TB';

  return (
    <div
      className={cn(
        'relative box-border flex w-full flex-col items-center justify-center gap-2 rounded-xl border px-3 py-2.5 shadow-sm transition-all duration-300',
        getNodeClassName(data),
      )}
      style={{
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
      }}
    >
      {data.isCurrent && <CurrentIndicator />}

      {tb ? <TbHandles /> : <LrHandles />}

      <span
        className={cn('w-full truncate px-0.5 text-center text-sm font-medium tracking-tight', getLabelClassName(data))}
        title={data.label}
      >
        {data.label}
      </span>

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
  <div className="flex max-w-full flex-wrap items-center justify-center gap-1">
    {data.visitCount > 1 && (
      <Badge
        variant="secondary"
        className="bg-secondary/50 text-secondary-foreground hover:bg-secondary/70 h-5 shrink-0 px-1.5 text-[10px]"
      >
        {data.visitCount}x
      </Badge>
    )}
    {data.isEnd && (
      <Badge
        variant="outline"
        className="h-5 shrink-0 border-green-500/30 bg-green-500/5 px-1.5 text-[10px] text-green-600"
      >
        End
      </Badge>
    )}
    {data.isStart && (
      <Badge
        variant="outline"
        className="h-5 shrink-0 border-blue-500/30 bg-blue-500/5 px-1.5 text-[10px] text-blue-600"
      >
        Start
      </Badge>
    )}
  </div>
);

export default StateNode;
