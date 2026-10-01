import { formatDistanceToNowStrict } from 'date-fns';
import { GripVertical, MoreHorizontal, Star } from 'lucide-react';
import { type HTMLAttributes, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.tsx';
import { Card } from '@/components/ui/card.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import NewWorkflowRunDialog from '@/features/workspaces/components/NewWorkflowRunDialog.tsx';
import { cn } from '@/lib/utils.ts';
import { useStudio } from '@/providers/StudioProvider.tsx';
import type { FleetEntry } from './fleet-model.ts';
import { STATE_ICON, STATE_LABEL, STATE_TEXT, runAge } from './fleet-presentation.ts';

interface WorkspaceCardProps {
  entry: FleetEntry;
  dragHandlers: HTMLAttributes<HTMLElement> & { draggable: boolean };
  isDragging: boolean;
  isDropTarget: boolean;
  onMove: (direction: -1 | 1) => void;
}

export default function WorkspaceCard({ entry, dragHandlers, isDragging, isDropTarget, onMove }: WorkspaceCardProps) {
  const { router } = useStudio();
  const [newRunOpen, setNewRunOpen] = useState(false);
  const { workspace, state, run, moreRuns } = entry;

  const StateIcon = STATE_ICON[state];

  return (
    // The Card primitive ships its own padding and gaps; this card lays out its own rows instead. The
    // min-height keeps an idle card the same size as a busy one, so the grid stays an even surface.
    <Card
      {...dragHandlers}
      className={cn(
        'group/card flex h-full min-h-28 flex-col gap-0 overflow-hidden p-0 transition-shadow',
        isDragging && 'opacity-40',
        isDropTarget && 'ring-primary ring-2',
      )}
    >
      <div className="flex items-center gap-2 px-4 pt-3">
        <GripVertical className="text-muted-foreground/40 -ml-1.5 size-4 shrink-0 cursor-grab opacity-0 transition-opacity group-hover/card:opacity-100" />
        <Link
          to={router.getWorkspace(workspace.id)}
          draggable={false}
          className="hover:text-primary truncate font-semibold"
        >
          {workspace.title}
        </Link>
        {workspace.isFavourite && <Star className="size-3.5 shrink-0 fill-current text-yellow-500" />}
        <span className="text-muted-foreground ml-auto shrink-0 truncate text-xs">{workspace.appName}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground -mr-2 size-7 shrink-0"
              aria-label={`Actions for ${workspace.title}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setNewRunOpen(true)}>New run</DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={router.getWorkspaceRuns(workspace.id)}>Runs</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={router.getWorkspace(workspace.id)}>Open workspace</Link>
            </DropdownMenuItem>
            {/* The keyboard's way to reorder: native drag answers to the pointer only. */}
            <DropdownMenuItem onSelect={() => onMove(-1)}>Move earlier</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onMove(1)}>Move later</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {run && (
        // The run block itself is the link — a real anchor, so cmd-click and middle-click keep working
        // and the board stays open behind the tab it opens.
        <Link
          to={router.getWorkflow(run.id)}
          target="_blank"
          rel="noopener noreferrer"
          draggable={false}
          className="hover:bg-muted/40 mt-1 flex gap-2 px-4 pt-1 pb-3 text-sm transition-colors"
        >
          {StateIcon && (
            <StateIcon
              className={cn('mt-0.5 size-4 shrink-0', STATE_TEXT[state], state === 'working' && 'animate-spin')}
              aria-label={STATE_LABEL[state]}
            />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate">
              <span className="text-muted-foreground">#{run.run}</span> {run.workflowName}
            </span>
            <span className="text-muted-foreground block truncate text-xs">
              {state === 'waiting' ? 'parked at' : 'at'} <code className="font-mono">{run.place}</code> ·{' '}
              {runAge(formatDistanceToNowStrict(new Date(run.createdAt)))}
              {moreRuns > 0 && ` · ${moreRuns + 1} active runs`}
            </span>
          </span>
        </Link>
      )}

      <NewWorkflowRunDialog
        isOpen={newRunOpen}
        onOpenChange={setNewRunOpen}
        workspace={workspace}
        onSuccess={() => setNewRunOpen(false)}
      />
    </Card>
  );
}
