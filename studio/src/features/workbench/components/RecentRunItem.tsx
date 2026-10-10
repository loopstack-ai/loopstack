import { formatDistanceToNow } from 'date-fns';
import type { WorkflowItemInterface } from '@loopstack/contracts/api';

const STATUS_DOT_COLORS: Record<string, string> = {
  completed: 'bg-green-500',
  running: 'bg-blue-500',
  failed: 'bg-red-500',
  paused: 'bg-yellow-500',
  canceled: 'bg-orange-500',
  pending: 'bg-muted-foreground',
};

interface RecentRunItemProps {
  workflow: WorkflowItemInterface;
  onClick: () => void;
}

export function RecentRunItem({ workflow, onClick }: RecentRunItemProps) {
  const dotColor = STATUS_DOT_COLORS[workflow.status] ?? 'bg-muted-foreground';

  return (
    <button className="hover:bg-accent w-full rounded-md px-2 py-2.5 text-left transition-colors" onClick={onClick}>
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
        <span className="truncate text-sm font-medium">
          Run #{workflow.run} &middot; {workflow.workflowName}
        </span>
      </div>
      <p className="text-muted-foreground mt-0.5 pl-3.5 text-xs">
        {workflow.status} &middot; {formatDistanceToNow(new Date(workflow.createdAt), { addSuffix: true })}
      </p>
    </button>
  );
}
