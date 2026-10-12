import { formatDistanceToNowStrict } from 'date-fns';
import { CornerDownRight, GripVertical, Star } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card.tsx';
import { cn } from '@/lib/utils.ts';
import { useStudio } from '@/providers/StudioProvider.tsx';
import WorkspaceActionsMenu from './WorkspaceActionsMenu.tsx';
import type { FleetEntry, FleetRunLine } from './fleet-model.ts';
import { STATE_DOT, STATE_ICON, STATE_LABEL, STATE_TEXT, TILE_MIN_HEIGHT, runAge } from './fleet-presentation.ts';

function RunLine({ line }: { line: FleetRunLine }) {
  const { router } = useStudio();
  const { root, active, state } = line;
  const StateIcon = STATE_ICON[state];
  const detailed = active ?? root;

  const details = (
    <span className="min-w-0 flex-1">
      <span className="block truncate">
        <span className="text-muted-foreground">#{detailed.run}</span> {detailed.workflowName}
      </span>
      <span className="text-muted-foreground block truncate text-xs">
        {state === 'waiting' ? 'parked at' : 'at'} <code className="font-mono">{detailed.place}</code> ·{' '}
        {runAge(formatDistanceToNowStrict(new Date(detailed.createdAt)))}
      </span>
    </span>
  );

  return (
    <div>
      {/* What the sub-workflow is part of. Its own link, so you can open the run that was started
          rather than the gate three levels inside it. */}
      {active && (
        <Link
          to={router.getWorkflow(root.id)}
          target="_blank"
          rel="noopener noreferrer"
          draggable={false}
          className="hover:bg-muted/40 block truncate px-3 py-0.5 transition-colors"
        >
          <span className="text-muted-foreground">#{root.run}</span> {root.workflowName}
        </Link>
      )}

      {/* The run that carries the state — a real anchor, so cmd-click and middle-click keep working
          and the board stays open behind the tab it opens. */}
      <Link
        to={router.getWorkflow(detailed.id)}
        target="_blank"
        rel="noopener noreferrer"
        draggable={false}
        className={cn(
          'hover:bg-muted/40 flex gap-2 px-3 py-0.5 transition-colors',
          active && 'border-border ml-5 border-l pl-2',
        )}
      >
        {active && <CornerDownRight className="text-muted-foreground/60 mt-0.5 size-3.5 shrink-0" />}
        {StateIcon && (
          <StateIcon
            className={cn('mt-0.5 size-4 shrink-0', STATE_TEXT[state], state === 'working' && 'animate-spin')}
            aria-label={STATE_LABEL[state]}
          />
        )}
        {details}
      </Link>
    </div>
  );
}

interface WorkspaceCardProps {
  entry: FleetEntry;
  handleProps: HTMLAttributes<HTMLElement> & { draggable: boolean };
  dropProps: HTMLAttributes<HTMLElement>;
  isDragging: boolean;
  isDropTarget: boolean;
  /** Adds the card's app to the board's filter. */
  onFilterApp: (appName: string) => void;
  onDelete: (workspaceId: string) => void;
}

export default function WorkspaceCard({
  entry,
  handleProps,
  dropProps,
  isDragging,
  isDropTarget,
  onFilterApp,
  onDelete,
}: WorkspaceCardProps) {
  const { router } = useStudio();
  const { workspace, state, runs } = entry;

  return (
    // The Card primitive ships its own padding and gaps; this card lays out its own rows instead. The
    // min-height keeps an idle card the same size as a busy one, so the grid stays an even surface.
    <Card
      {...dropProps}
      className={cn(
        'group/card flex h-full flex-row gap-0 overflow-hidden p-0 transition-shadow',
        TILE_MIN_HEIGHT,
        isDragging && 'opacity-40',
        isDropTarget && 'ring-primary ring-2',
      )}
    >
      {/* The grip runs the card's full height: the whole left edge is the thing you grab. */}
      <div
        {...handleProps}
        aria-label={`Reorder ${workspace.title}`}
        className="bg-muted/30 hover:bg-muted flex w-5 shrink-0 cursor-grab items-center justify-center border-r transition-colors active:cursor-grabbing"
      >
        <GripVertical className="text-muted-foreground/30 group-hover/card:text-muted-foreground/70 size-3.5 transition-colors" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 px-3 pt-3">
          <span className={cn('size-2 shrink-0 rounded-full', STATE_DOT[state])} aria-hidden />
          <Link
            to={router.getWorkspace(workspace.id)}
            draggable={false}
            className="hover:text-primary truncate font-semibold"
          >
            {workspace.title}
          </Link>
          {workspace.isFavourite && <Star className="size-3.5 shrink-0 fill-current text-yellow-500" />}
          <button
            type="button"
            onClick={() => onFilterApp(workspace.appName)}
            title={`Filter by ${workspace.appName}`}
            className="text-muted-foreground hover:text-foreground ml-auto shrink-0 cursor-pointer truncate text-xs"
          >
            {workspace.appName}
          </button>
          <WorkspaceActionsMenu workspace={workspace} onDelete={onDelete} className="-mr-1.5" />
        </div>

        {runs.length > 0 && (
          <div className="mt-1 space-y-1.5 pb-3 text-sm">
            {runs.map((line) => (
              <RunLine key={line.root.id} line={line} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
