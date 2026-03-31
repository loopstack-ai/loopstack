import { formatDistanceToNow } from 'date-fns';
import { ChevronDown, Loader2, Play } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { WorkflowItemInterface } from '@loopstack/contracts/api';
import { Button } from '@/components/ui/button.tsx';
import { NewRunDialog } from '@/features/workbench';
import { useFilterWorkflows } from '@/hooks/useWorkflows.ts';
import { useStudio } from '@/providers/StudioProvider.tsx';

const STATUS_DOT_COLORS: Record<string, string> = {
  completed: 'bg-green-500',
  running: 'bg-blue-500',
  failed: 'bg-red-500',
  paused: 'bg-yellow-500',
  canceled: 'bg-orange-500',
  pending: 'bg-muted-foreground',
};

export default function StudioLandingPage() {
  const { router } = useStudio();
  const [newRunDialogOpen, setNewRunDialogOpen] = useState(false);
  const [limit, setLimit] = useState(3);
  const fetchWorkflows = useFilterWorkflows(undefined, { parentId: null }, 'createdAt', 'DESC', 0, limit);
  const workflows = fetchWorkflows.data?.data ?? [];
  const total = fetchWorkflows.data?.total ?? 0;
  const hasMore = workflows.length < total;

  const fetchPaused = useFilterWorkflows(undefined, { parentId: null, status: 'paused' }, 'createdAt', 'DESC', 0, 5);
  const pausedRuns = fetchPaused.data?.data ?? [];

  const handleNewRunSuccess = useCallback(
    (workflowId: string) => {
      setNewRunDialogOpen(false);
      void router.navigateToWorkflow(workflowId);
    },
    [router],
  );

  const handleRunClick = useCallback(
    (workflowId: string) => {
      void router.navigateToWorkflow(workflowId);
    },
    [router],
  );

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="flex justify-center">
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setNewRunDialogOpen(true)}>
            <Play className="h-3.5 w-3.5" />
            New Run
          </Button>
        </div>

        {pausedRuns.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium">Needs Attention</p>
            <div className="divide-border divide-y">
              {pausedRuns.map((workflow) => (
                <RecentRunItem key={workflow.id} workflow={workflow} onClick={() => handleRunClick(workflow.id)} />
              ))}
            </div>
          </div>
        )}

        {fetchWorkflows.isLoading && workflows.length === 0 ? (
          <div className="flex justify-center py-4">
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          </div>
        ) : workflows.length > 0 ? (
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium">Recent</p>
            <div className="max-h-[280px] overflow-auto">
              <div className="divide-border divide-y">
                {workflows.map((workflow) => (
                  <RecentRunItem key={workflow.id} workflow={workflow} onClick={() => handleRunClick(workflow.id)} />
                ))}
              </div>
            </div>
            {hasMore && (
              <button
                className="text-muted-foreground hover:text-foreground mt-2 flex w-full items-center justify-center gap-1 py-1 text-xs transition-colors"
                onClick={() => setLimit((prev) => prev + 5)}
              >
                <ChevronDown className="h-3 w-3" />
                Load more
              </button>
            )}
          </div>
        ) : null}
      </div>

      <NewRunDialog open={newRunDialogOpen} onOpenChange={setNewRunDialogOpen} onSuccess={handleNewRunSuccess} />
    </div>
  );
}

function RecentRunItem({ workflow, onClick }: { workflow: WorkflowItemInterface; onClick: () => void }) {
  const dotColor = STATUS_DOT_COLORS[workflow.status] ?? 'bg-muted-foreground';

  return (
    <button className="hover:bg-accent w-full rounded-md px-2 py-2.5 text-left transition-colors" onClick={onClick}>
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
        <span className="truncate text-sm font-medium">
          Run #{workflow.run} &middot; {workflow.blockName}
        </span>
      </div>
      <p className="text-muted-foreground mt-0.5 pl-3.5 text-xs">
        {workflow.status} &middot; {formatDistanceToNow(new Date(workflow.createdAt), { addSuffix: true })}
      </p>
    </button>
  );
}
