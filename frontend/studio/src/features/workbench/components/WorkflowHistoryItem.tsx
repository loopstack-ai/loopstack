import { format } from 'date-fns';
import { ChevronRight, Clock, Loader2, Play } from 'lucide-react';
import React from 'react';
import type { WorkflowItemInterface } from '@loopstack/contracts/api';
import type { WorkflowCheckpoint } from '@/api/workflows.ts';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible.tsx';
import { useWorkflowCheckpoints } from '@/hooks/useWorkflows.ts';
import { cn } from '@/lib/utils.ts';

interface WorkflowHistoryItemProps {
  workflowId: string;
  workflow: WorkflowItemInterface;
}

const WorkflowHistoryItem: React.FC<WorkflowHistoryItemProps> = ({ workflowId, workflow }) => {
  const checkpointsQuery = useWorkflowCheckpoints(workflowId);
  const checkpoints = checkpointsQuery.data;

  if (checkpointsQuery.isLoading) {
    return (
      <li className="group/menu-item relative list-none">
        <div className="flex w-full items-center gap-2 rounded-md p-2 text-sm opacity-50">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </li>
    );
  }

  if (!checkpoints?.length) {
    return null;
  }

  return (
    <Collapsible defaultOpen className="group/collapsible">
      <li className="group/menu-item relative list-none">
        <CollapsibleTrigger asChild>
          <button className="hover:bg-accent hover:text-accent-foreground group/trigger flex w-full items-center gap-2 rounded-md p-2 text-left text-sm font-medium">
            <Play className="text-primary h-3.5 w-3.5 fill-current" />
            <span className="truncate text-sm">{workflow.title ?? workflow.alias}</span>
            <ChevronRight className="text-muted-foreground ml-auto h-3.5 w-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <ul className="ml-2 flex min-w-0 flex-col gap-1 pl-0">
            <div className="relative py-2">
              <div className="from-primary/60 via-primary/30 to-muted/20 absolute top-7 bottom-3 left-1.75 w-0.5 rounded-full bg-linear-to-b" />

              <div className="group/entry relative flex gap-3 py-1 pl-0">
                <div className="relative z-10 flex shrink-0 items-center justify-center">
                  <div className="border-primary/60 bg-primary/20 flex h-4 w-4 items-center justify-center rounded-full border-2" />
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="bg-muted text-foreground w-fit truncate rounded px-1.5 py-0.5 font-mono text-xs font-medium">
                    start
                  </span>
                </div>
              </div>

              {checkpoints.map((entry: WorkflowCheckpoint, index: number) => {
                const isLast = index === checkpoints.length - 1;
                const place = entry.place ?? 'unknown';
                const transitionName = entry.transitionId;

                return (
                  <div key={entry.version} className="group/entry relative flex gap-3 py-1 pl-0">
                    <div className="relative z-10 flex shrink-0 items-center justify-center">
                      <div
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all',
                          isLast
                            ? 'border-primary bg-primary shadow-primary/40 shadow-sm'
                            : 'border-muted-foreground/30 bg-background',
                        )}
                      >
                        {isLast && <div className="bg-primary-foreground h-1.5 w-1.5 animate-pulse rounded-full" />}
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className={cn(
                            'w-fit truncate rounded px-1.5 py-0.5 font-mono text-xs font-medium',
                            isLast ? 'bg-primary/15 text-primary' : 'bg-muted/60 text-muted-foreground',
                          )}
                        >
                          {place}
                        </span>
                        {transitionName && (
                          <span className="text-muted-foreground truncate text-[10px] italic">
                            (via {transitionName})
                          </span>
                        )}
                      </div>

                      <div className="text-muted-foreground flex items-center gap-2 text-[10px]">
                        <div className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          <span className="tabular-nums">{format(new Date(entry.createdAt), 'HH:mm:ss')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ul>
        </CollapsibleContent>
      </li>
    </Collapsible>
  );
};

export default WorkflowHistoryItem;
