import React from 'react';
import { format } from 'date-fns';
import { ChevronRight, Clock, Loader2, Play, Wrench } from 'lucide-react';
import type { WorkflowItemDto } from '@loopstack/api-client';
import type { DocumentItemInterface, WorkflowInterface } from '@loopstack/contracts/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible.tsx';
import { SidebarMenuButton, SidebarMenuItem, SidebarMenuSub } from '@/components/ui/sidebar.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import { useWorkflow } from '@/hooks/useWorkflows.ts';
import { cn } from '@/lib/utils.ts';

interface WorkflowHistoryItemProps {
  workflowId: string;
  workflow: WorkflowItemDto;
}

export interface HistoryTransitionMetadata {
  place: string;
  tools: Record<string, Record<string, unknown>>;
  documents: DocumentItemInterface[];
  transition: {
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

const WorkflowHistoryItem: React.FC<WorkflowHistoryItemProps> = ({ workflowId, workflow }) => {
  const fetchWorkflow = useWorkflow(workflowId);
  const workflowData = fetchWorkflow.data as WorkflowInterface | undefined;
  const history = workflowData?.history as unknown as HistoryTransition[] | undefined;

  if (fetchWorkflow.isLoading) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton className="opacity-50">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-sm">Loading...</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  if (!history?.length) {
    return null;
  }

  return (
    <Collapsible defaultOpen className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="group/trigger font-medium">
            <Play className="text-primary h-3.5 w-3.5 fill-current" />
            <span className="truncate text-sm">{workflow.title ?? workflow.blockName}</span>
            <ChevronRight className="text-muted-foreground ml-auto h-3.5 w-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarMenuSub className="ml-2 border-none pl-0">
            <div className="relative py-2">
              <div className="from-primary/60 via-primary/30 to-muted/20 absolute top-7 bottom-3 left-[7px] w-0.5 rounded-full bg-gradient-to-b" />

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

              {history.map((entry: HistoryTransition, index: number) => {
                const transition = entry.metadata?.transition;
                const toolNames = Object.keys(entry.metadata?.tools ?? {});
                const isLast = index === history.length - 1;

                const place = entry.metadata?.place ?? transition?.to ?? 'unknown';
                const transitionName = transition?.transition;

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
                        {toolNames.length > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex cursor-default items-center gap-0.5">
                                <Wrench className="h-3 w-3" />
                                <span className="tabular-nums">{toolNames.length}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-48">
                              <p className="text-xs font-medium">Tools used:</p>
                              <p className="text-muted-foreground text-[11px]">{toolNames.join(', ')}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <div className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          <span className="tabular-nums">{format(new Date(entry.timestamp), 'HH:mm:ss')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
};

export default WorkflowHistoryItem;
