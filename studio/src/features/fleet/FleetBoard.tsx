import { LayoutGrid, List, Play, Trash2 } from 'lucide-react';
import { useEffect, useEffectEvent, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { WorkspaceActivity } from '@loopstack/contracts/api';
import ConfirmDialog from '@/components/data-table/ConfirmDialog';
import DataTableBatchActions from '@/components/data-table/DataTableBatchAction';
import DataTableFilters from '@/components/data-table/DataTableFilters';
import DataTablePagination from '@/components/data-table/DataTablePagination';
import DataTableToolbar from '@/components/data-table/DataTableToolbar';
import { type FilterSpec, type FilterValue, filterValues, hasFilterValue } from '@/components/data-table/data-table.ts';
import ErrorSnackbar from '@/components/feedback/ErrorSnackbar';
import LoadingCentered from '@/components/feedback/LoadingCentered';
import { Button } from '@/components/ui/button.tsx';
import { NewRunDialog } from '@/features/workbench/components/NewRunDialog.tsx';
import { useAppTypes } from '@/features/workspaces/useAppTypes.ts';
import { useDebounce } from '@/hooks/useDebounce.ts';
import { useBatchDeleteWorkspaces } from '@/hooks/useWorkspaces.ts';
import { cn } from '@/lib/utils.ts';
import { useStudioPreferences } from '@/providers/StudioPreferencesProvider.tsx';
import { useStudio } from '@/providers/StudioProvider.tsx';
import FleetTable from './FleetTable.tsx';
import NewWorkspaceTile from './NewWorkspaceTile.tsx';
import WorkspaceCard from './WorkspaceCard.tsx';
import type { FleetCounts, FleetEntry } from './fleet-model.ts';
import { STATE_LABEL } from './fleet-presentation.ts';
import { type FleetPage, type FleetQuery, useFleet } from './useFleet.ts';
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

/** How many rows a page of the list view holds until another size is picked. */
const LIST_PAGE_SIZE = 25;

/**
 * The board's filters, keyed as the filter bar shows them. `workspaces` is the view's own control, not a
 * field — it becomes the API's favourites question, as the runs list's `runs` chip becomes `topLevel`.
 */
function toFleetQuery(
  filters: Record<string, FilterValue>,
  search: string | undefined,
  page: FleetPage | undefined,
): FleetQuery {
  return {
    search: search || undefined,
    appName: filterValues(filters.appName),
    favouritesOnly: filters.workspaces === 'favourites',
    activity: filterValues(filters.state) as WorkspaceActivity[],
    ...(page ? { page } : {}),
  };
}

/**
 * The workspace dashboard: what every workspace is doing right now, and the one place workspaces are listed.
 *
 * The grid never reorders on a state change — a card stays where it was, and urgency is carried by its own
 * state marker and the counter line instead. A board whose cards move while you read it is unusable exactly
 * when the fleet is busy. The list view holds still for the same reason: it sorts only by the workspace's own
 * columns, which no run changes. The exception is opt-in: the search and the filters — state, app,
 * favourites — are answered by the workspace API, so with a state filter set a workspace comes and goes with
 * its runs.
 *
 * The two views ask for different workspaces: the cards for the first page by title, in the order they were
 * dragged into; the list for one page at a time, in the order of the column it is sorted by.
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

  const density = preferences.fleetDensity;
  const sort = preferences.fleetListSort;
  const [pageSize, setPageSize] = useState(LIST_PAGE_SIZE);
  // A new search, filter, sort or page size starts again at the first page.
  const pageKey = JSON.stringify([filters, debouncedSearch, sort, pageSize]);
  const [listPage, setListPage] = useState({ key: pageKey, index: 0 });
  const pageIndex = listPage.key === pageKey ? listPage.index : 0;
  const setPageIndex = (index: number) => setListPage({ key: pageKey, index });

  const page = density === 'list' ? { sort, index: pageIndex, size: pageSize } : undefined;
  const { entries, counts, total, isLoading, error } = useFleet(toFleetQuery(filters, debouncedSearch, page));
  const shownIds = entries.map((entry) => entry.workspace.id);

  // A page emptied by a delete gives way to the last page that still has workspaces.
  const lastPageIndex = Math.max(0, Math.ceil(total / pageSize) - 1);
  if (page && !isLoading && pageIndex > lastPageIndex) setPageIndex(lastPageIndex);
  const drag = useFleetDrag(shownIds);

  const [newRunOpen, setNewRunOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const batchDeleteWorkspaces = useBatchDeleteWorkspaces();

  // A link into the board may carry a filter — an app from the app launcher, favourites from the sidebar.
  // Applied once per link: an effect event reads the saved filters without re-running on their change.
  const linkAppName = searchParams.get('appName');
  const linkFavourites = searchParams.get('favourites') === 'true';
  const applyLinkFilter = useEffectEvent(() => {
    setPreference('fleetFilters', {
      ...preferences.fleetFilters,
      ...(linkAppName ? { appName: [linkAppName] } : {}),
      ...(linkFavourites ? { workspaces: 'favourites' } : {}),
    });
  });
  useEffect(() => {
    if (linkAppName || linkFavourites) applyLinkFilter();
  }, [linkAppName, linkFavourites]);
  // The link opens the filter panel, adjusted during render as it is this component's own state.
  const linkFilter = linkAppName || linkFavourites ? `${linkAppName ?? ''}/${linkFavourites}` : '';
  const [appliedLinkFilter, setAppliedLinkFilter] = useState('');
  if (linkFilter !== appliedLinkFilter) {
    setAppliedLinkFilter(linkFilter);
    if (linkFilter) setIsFilterOpen(true);
  }

  // Relative times must keep moving even though `updatedAt` does not.
  useRelativeClock();

  if (isLoading) return <LoadingCentered loading />;

  // A selection only ever covers what is on screen: a workspace a filter or another page hides is not deleted
  // with the rest.
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

  // Deleted workspaces leave the cards' saved order too, whichever view they were deleted from.
  const forgetDeleted = (workspaceId: string) => drag.forget([workspaceId]);

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

  const cardProps = (entry: FleetEntry) => ({
    entry,
    handleProps: drag.handleProps(entry.workspace.id),
    dropProps: drag.dropProps(entry.workspace.id),
    isDragging: drag.draggingId === entry.workspace.id,
    isDropTarget: drag.overId === entry.workspace.id,
    onFilterApp: (appName: string) => addFilterValue('appName', appName),
    onDelete: forgetDeleted,
  });

  // The list shows one page, so its counts say they are the page's and not the fleet's.
  const stateSummary = summary(counts);
  const isPartialPage = density === 'list' && total > entries.length;

  return (
    <>
      {error && <ErrorSnackbar error={error} />}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {stateSummary
              ? `${stateSummary}${isPartialPage ? ' on this page' : ''}`
              : isFiltered
                ? 'No matching workspaces'
                : 'No workspaces yet'}
            {density === 'grid' && drag.hasManualOrder && (
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
            <WorkspaceCard key={entry.workspace.id} {...cardProps(entry)} />
          ))}
          <NewWorkspaceTile variant="card" />
        </div>
      ) : (
        <div>
          <FleetTable
            entries={entries}
            sort={sort}
            onSortChange={(next) => setPreference('fleetListSort', next)}
            selected={selectedShown}
            onSelectedChange={toggleSelected}
            onSelectAll={toggleSelectAll}
            onFilterApp={(appName) => addFilterValue('appName', appName)}
            onDelete={forgetDeleted}
          />
          <DataTablePagination
            page={pageIndex}
            pageSize={pageSize}
            totalItems={total}
            onPageChange={setPageIndex}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {density === 'grid' && total > entries.length && (
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
