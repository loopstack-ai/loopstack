import { formatDistanceToNowStrict } from 'date-fns';
import { GripVertical, LayoutGrid, List, Play, Trash2 } from 'lucide-react';
import { type HTMLAttributes, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { WorkspaceActivity } from '@loopstack/contracts/api';
import ConfirmDialog from '@/components/data-table/ConfirmDialog';
import DataTableBatchActions from '@/components/data-table/DataTableBatchAction';
import DataTableFilters from '@/components/data-table/DataTableFilters';
import DataTableToolbar from '@/components/data-table/DataTableToolbar';
import { type FilterSpec, type FilterValue, filterValues, hasFilterValue } from '@/components/data-table/data-table.ts';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import LoadingCentered from '@/components/feedback/LoadingCentered';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { NewRunDialog } from '@/features/workbench/components/NewRunDialog.tsx';
import { useAppTypes } from '@/features/workspaces/useAppTypes.ts';
import { useDebounce } from '@/hooks/useDebounce.ts';
import { useBatchDeleteWorkspaces } from '@/hooks/useWorkspaces.ts';
import { cn } from '@/lib/utils.ts';
import { useStudioPreferences } from '@/providers/StudioPreferencesProvider.tsx';
import { useStudio } from '@/providers/StudioProvider.tsx';
import NewWorkspaceTile from './NewWorkspaceTile.tsx';
import WorkspaceActionsMenu from './WorkspaceActionsMenu.tsx';
import WorkspaceCard from './WorkspaceCard.tsx';
import type { FleetCounts, FleetEntry } from './fleet-model.ts';
import { STATE_ICON, STATE_LABEL, STATE_TEXT, runAge } from './fleet-presentation.ts';
import { type FleetQuery, useFleet } from './useFleet.ts';
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

const STATES: WorkspaceActivity[] = ['waiting', 'working', 'queued', 'idle'];

/**
 * The board's filters, keyed as the filter bar shows them. `workspaces` is the view's own control, not a
 * field — it becomes the API's favourites question, as the runs list's `runs` chip becomes `topLevel`.
 */
function toFleetQuery(filters: Record<string, FilterValue>, search: string | undefined): FleetQuery {
  return {
    search: search || undefined,
    appName: filterValues(filters.appName),
    favouritesOnly: filters.workspaces === 'favourites',
    activity: filterValues(filters.state) as WorkspaceActivity[],
  };
}

interface FleetRowProps {
  entry: FleetEntry;
  handleProps: HTMLAttributes<HTMLElement> & { draggable: boolean };
  dropProps: HTMLAttributes<HTMLElement>;
  isDragging: boolean;
  isDropTarget: boolean;
  isSelected: boolean;
  onSelectedChange: () => void;
  onFilterApp: (appName: string) => void;
  onDelete: (workspaceId: string) => void;
}

function FleetRow({
  entry,
  handleProps,
  dropProps,
  isDragging,
  isDropTarget,
  isSelected,
  onSelectedChange,
  onFilterApp,
  onDelete,
}: FleetRowProps) {
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
        isSelected && 'bg-muted/50',
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
      <span className="flex items-center pl-3">
        <Checkbox checked={isSelected} onCheckedChange={onSelectedChange} aria-label={`Select ${workspace.title}`} />
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
      <span className="flex shrink-0 items-center gap-2 pr-2">
        <button
          type="button"
          onClick={() => onFilterApp(workspace.appName)}
          title={`Filter by ${workspace.appName}`}
          className="text-muted-foreground hover:text-foreground hidden cursor-pointer truncate text-xs md:inline"
        >
          {workspace.appName}
        </button>
        <WorkspaceActionsMenu workspace={workspace} onDelete={onDelete} />
      </span>
    </li>
  );
}

/**
 * The workspace dashboard: what every workspace is doing right now, and the one place workspaces are listed.
 *
 * The grid never reorders on a state change — a card stays where it was, and urgency is carried by its own
 * state marker and the counter line instead. A board whose cards move while you read it is unusable exactly
 * when the fleet is busy. The exception is opt-in: the search and the filters — state, app, favourites — are
 * answered by the workspace API, so with a state filter set a card comes and goes with its runs.
 */
export default function FleetBoard() {
  const { preferences, setPreference } = useStudioPreferences();
  const { router } = useStudio();
  const [searchParams] = useSearchParams();
  const { types: appTypes } = useAppTypes();

  const filters = preferences.fleetFilters;
  const setFilters = (next: Record<string, FilterValue>) => setPreference('fleetFilters', next);
  const activeFilterCount = Object.values(filters).filter(hasFilterValue).length;
  const [isFilterOpen, setIsFilterOpen] = useState(activeFilterCount > 0);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { entries, counts, total, isLoading, error } = useFleet(toFleetQuery(filters, debouncedSearch));
  const shownIds = entries.map((entry) => entry.workspace.id);
  const drag = useFleetDrag(shownIds);

  const [newRunOpen, setNewRunOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const batchDeleteWorkspaces = useBatchDeleteWorkspaces();

  // A link into the board may carry a filter — an app from the app launcher, favourites from the sidebar.
  useEffect(() => {
    const appName = searchParams.get('appName');
    const favourites = searchParams.get('favourites') === 'true';
    if (!appName && !favourites) return;
    setPreference('fleetFilters', {
      ...preferences.fleetFilters,
      ...(appName ? { appName: [appName] } : {}),
      ...(favourites ? { workspaces: 'favourites' } : {}),
    });
    setIsFilterOpen(true);
    // Applied once per link, not on every change of the saved filters — so they are not a dependency.
  }, [searchParams]);

  // Relative times must keep moving even though `updatedAt` does not.
  useRelativeClock();

  if (isLoading) return <LoadingCentered loading />;

  const density = preferences.fleetDensity;
  // A selection only ever covers what is on screen: a workspace a filter hid is not deleted with the rest.
  const selectedShown = selected.filter((id) => shownIds.includes(id));
  const isFiltered = activeFilterCount > 0 || !!searchTerm;

  /**
   * Clicking a value adds it to its filter rather than replacing it, so clicking two apps asks for either —
   * the same question the multi-select dropdown asks.
   */
  const addFilterValue = (key: string, value: string) => {
    const current = filterValues(filters[key]);
    if (!current.includes(value)) setFilters({ ...filters, [key]: [...current, value] });
    setIsFilterOpen(true);
  };

  const toggleSelected = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const toggleSelectAll = () => setSelected(selectedShown.length === shownIds.length ? [] : shownIds);

  const deleteSelected = () => {
    batchDeleteWorkspaces.mutate(selectedShown);
    drag.forget(selectedShown);
    setSelected([]);
    setBatchDeleteOpen(false);
  };

  const filterConfig: Record<string, FilterSpec> = {
    workspaces: [{ label: 'Favourites only', value: 'favourites' }],
    state: { multiple: true, options: STATES.map((state) => ({ label: STATE_LABEL[state], value: state })) },
    appName: { multiple: true, options: appTypes.map((app) => app.appName) },
  };

  const itemProps = (entry: FleetEntry) => ({
    entry,
    handleProps: drag.handleProps(entry.workspace.id),
    dropProps: drag.dropProps(entry.workspace.id),
    isDragging: drag.draggingId === entry.workspace.id,
    isDropTarget: drag.overId === entry.workspace.id,
    onFilterApp: (appName: string) => addFilterValue('appName', appName),
    onDelete: (workspaceId: string) => drag.forget([workspaceId]),
  });

  return (
    <>
      {error && <ErrorSnackbar error={error} />}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {summary(counts) || (isFiltered ? 'No matching workspaces' : 'No workspaces yet')}
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

      <div>
        <DataTableToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onFilterToggle={() => setIsFilterOpen(!isFilterOpen)}
          filterCount={activeFilterCount}
          isFilterOpen={isFilterOpen}
          showFilter
          showSearch
        >
          {density === 'list' && (
            <div className="flex items-center gap-4">
              <label className="text-muted-foreground flex items-center gap-2 text-sm">
                <Checkbox
                  checked={shownIds.length > 0 && selectedShown.length === shownIds.length}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all workspaces"
                />
                Select all
              </label>
              <DataTableBatchActions
                selectedCount={selectedShown.length}
                batchActions={[
                  {
                    id: 'delete',
                    label: 'Delete Selected',
                    icon: <Trash2 className="mr-2 h-4 w-4" />,
                    variant: 'destructive',
                    action: () => setBatchDeleteOpen(true),
                  },
                ]}
                onBatchAction={(action) => void action.action(selectedShown)}
              />
            </div>
          )}
        </DataTableToolbar>
        <DataTableFilters
          filters={filters}
          filterConfig={filterConfig}
          onFiltersChange={setFilters}
          isOpen={isFilterOpen}
        />
      </div>

      {isFiltered && entries.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No workspaces match the search and filters.{' '}
          <button
            type="button"
            onClick={() => {
              setFilters({});
              setSearchTerm('');
            }}
            className="hover:text-foreground cursor-pointer underline underline-offset-2"
          >
            Clear
          </button>
        </p>
      )}

      {density === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <WorkspaceCard key={entry.workspace.id} {...itemProps(entry)} />
          ))}
          <NewWorkspaceTile variant="card" />
        </div>
      ) : (
        <ul className="border-border bg-card divide-y overflow-hidden rounded-lg border">
          {entries.map((entry) => (
            <FleetRow
              key={entry.workspace.id}
              {...itemProps(entry)}
              isSelected={selectedShown.includes(entry.workspace.id)}
              onSelectedChange={() => toggleSelected(entry.workspace.id)}
            />
          ))}
          <li>
            <NewWorkspaceTile variant="row" />
          </li>
        </ul>
      )}

      {total > entries.length && (
        <p className="text-muted-foreground text-xs">
          Showing {entries.length} of {total} workspaces. Search or filter to find the rest.
        </p>
      )}

      <ConfirmDialog
        isOpen={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        title={`Delete ${selectedShown.length} workspaces?`}
        description="The workspaces and every run in them are removed. This cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={deleteSelected}
      />

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
