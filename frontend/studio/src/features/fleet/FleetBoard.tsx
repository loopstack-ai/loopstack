import { formatDistanceToNowStrict } from 'date-fns';
import { GripVertical, LayoutGrid, List, Play } from 'lucide-react';
import { type HTMLAttributes, useState } from 'react';
import { Link } from 'react-router-dom';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import LoadingCentered from '@/components/feedback/LoadingCentered';
import { Button } from '@/components/ui/button.tsx';
import { NewRunDialog } from '@/features/workbench/components/NewRunDialog.tsx';
import { cn } from '@/lib/utils.ts';
import { useStudioPreferences } from '@/providers/StudioPreferencesProvider.tsx';
import { useStudio } from '@/providers/StudioProvider.tsx';
import NewWorkspaceTile from './NewWorkspaceTile.tsx';
import WorkspaceCard from './WorkspaceCard.tsx';
import type { FleetCounts, FleetEntry } from './fleet-model.ts';
import { STATE_ICON, STATE_LABEL, STATE_TEXT, runAge } from './fleet-presentation.ts';
import { useFleet } from './useFleet.ts';
import { useFleetDrag } from './useFleetDrag.ts';
import { useRelativeClock } from './useRelativeClock.ts';

/** The fleet in one line. States with nothing in them are left out rather than reported as zero. */
function summary(counts: FleetCounts): string {
  const parts = [
    counts.working > 0 && `${counts.working} working`,
    counts.waiting > 0 && `${counts.waiting} waiting on you`,
    counts.queued > 0 && `${counts.queued} queued`,
    counts.idle > 0 && `${counts.idle} idle`,
  ].filter(Boolean);
  return parts.join(' · ');
}

interface FleetRowProps {
  entry: FleetEntry;
  handleProps: HTMLAttributes<HTMLElement> & { draggable: boolean };
  dropProps: HTMLAttributes<HTMLElement>;
  isDragging: boolean;
  isDropTarget: boolean;
}

function FleetRow({ entry, handleProps, dropProps, isDragging, isDropTarget }: FleetRowProps) {
  const { router } = useStudio();
  const { workspace, state, runs } = entry;

  // A row has one line to spend, so it shows the run that speaks for the workspace and counts the rest.
  const lead = runs[0];
  const run = lead?.active ?? lead?.root;
  const StateIcon = STATE_ICON[state];

  const row = (
    <>
      <span className="flex size-4 shrink-0 items-center justify-center">
        {StateIcon && (
          <StateIcon
            className={cn('size-4', STATE_TEXT[state], state === 'working' && 'animate-spin')}
            aria-label={STATE_LABEL[state]}
          />
        )}
      </span>
      <span className="w-44 shrink-0 truncate font-medium">{workspace.title}</span>
      {run && (
        <>
          <span className="truncate">
            <span className="text-muted-foreground">#{run.run}</span> {run.workflowName}
          </span>
          <code className="text-muted-foreground hidden shrink-0 font-mono text-xs sm:inline">{run.place}</code>
          {runs.length > 1 && <span className="text-muted-foreground shrink-0 text-xs">+{runs.length - 1}</span>}
          <span className="text-muted-foreground ml-auto shrink-0 text-xs">
            {runAge(formatDistanceToNowStrict(new Date(run.createdAt)))}
          </span>
        </>
      )}
    </>
  );

  // Only a row with a run leads somewhere; an idle one is not a link to nowhere.
  return (
    <li
      {...dropProps}
      className={cn(
        'group/row flex items-stretch',
        isDragging && 'opacity-40',
        isDropTarget && 'ring-primary rounded-sm ring-2',
      )}
    >
      {/* Same grip as the cards, running the row's full height. */}
      <span
        {...handleProps}
        aria-label={`Reorder ${workspace.title}`}
        className="bg-muted/30 hover:bg-muted flex w-5 shrink-0 cursor-grab items-center justify-center transition-colors active:cursor-grabbing"
      >
        <GripVertical className="text-muted-foreground/30 group-hover/row:text-muted-foreground/70 size-3.5 transition-colors" />
      </span>
      {run ? (
        <Link
          to={router.getWorkflow(run.id)}
          target="_blank"
          rel="noopener noreferrer"
          draggable={false}
          className="hover:bg-muted/50 flex min-w-0 flex-1 items-center gap-3 px-4 py-2 text-sm transition-colors"
        >
          {row}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2 text-sm">{row}</div>
      )}
    </li>
  );
}

/**
 * The workspace dashboard: what every workspace is doing right now.
 *
 * The grid never reorders on a state change — a card stays where it was, and urgency is carried by its own
 * state marker and the counter line instead. A board whose cards move while you read it is unusable exactly
 * when the fleet is busy.
 */
export default function FleetBoard() {
  const { preferences, setPreference } = useStudioPreferences();
  const { entries, counts, total, isLoading, error } = useFleet();
  const [newRunOpen, setNewRunOpen] = useState(false);
  const { router } = useStudio();
  const drag = useFleetDrag(entries.map((entry) => entry.workspace.id));

  // Relative times must keep moving even though `updatedAt` does not.
  useRelativeClock();

  if (isLoading) return <LoadingCentered loading />;

  const density = preferences.fleetDensity;

  return (
    <>
      {error && <ErrorSnackbar error={error} />}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {summary(counts) || 'No workspaces yet'}
            {drag.hasManualOrder && (
              <>
                {' · '}
                <button
                  type="button"
                  onClick={drag.resetOrder}
                  className="hover:text-foreground cursor-pointer underline-offset-2 hover:underline"
                >
                  reset order
                </button>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className={cn('size-7', density === 'grid' && 'bg-muted')}
              onClick={() => setPreference('fleetDensity', 'grid')}
              aria-label="Card view"
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn('size-7', density === 'list' && 'bg-muted')}
              onClick={() => setPreference('fleetDensity', 'list')}
              aria-label="List view"
            >
              <List className="size-4" />
            </Button>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setNewRunOpen(true)}>
            <Play className="size-3.5" />
            New Run
          </Button>
        </div>
      </div>

      {density === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <WorkspaceCard
              key={entry.workspace.id}
              entry={entry}
              handleProps={drag.handleProps(entry.workspace.id)}
              dropProps={drag.dropProps(entry.workspace.id)}
              isDragging={drag.draggingId === entry.workspace.id}
              isDropTarget={drag.overId === entry.workspace.id}
            />
          ))}
          <NewWorkspaceTile variant="card" />
        </div>
      ) : (
        <ul className="border-border bg-card divide-y overflow-hidden rounded-lg border">
          {entries.map((entry) => (
            <FleetRow
              key={entry.workspace.id}
              entry={entry}
              handleProps={drag.handleProps(entry.workspace.id)}
              dropProps={drag.dropProps(entry.workspace.id)}
              isDragging={drag.draggingId === entry.workspace.id}
              isDropTarget={drag.overId === entry.workspace.id}
            />
          ))}
          <li>
            <NewWorkspaceTile variant="row" />
          </li>
        </ul>
      )}

      {total > entries.length && (
        <p className="text-muted-foreground text-xs">
          Showing {entries.length} of {total} workspaces.
        </p>
      )}

      <NewRunDialog
        open={newRunOpen}
        onOpenChange={setNewRunOpen}
        onSuccess={(workflowId) => {
          setNewRunOpen(false);
          void router.navigateToWorkflow(workflowId);
        }}
      />
    </>
  );
}
