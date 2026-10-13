import { type UseQueryResult, keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type {
  PaginatedInterface,
  WorkflowItemInterface,
  WorkspaceActivity,
  WorkspaceFilterInterface,
  WorkspaceInterface,
  WorkspaceSortByInterface,
} from '@loopstack/contracts/api';
import { SortOrder } from '@loopstack/contracts/enums';
import { useLoopstackClient } from '@loopstack/react';
import { ACTIVE_RUN_STATES } from '@/lib/run-status.ts';
import { useStudioPreferences } from '@/providers/StudioPreferencesProvider.tsx';
import {
  type FleetCounts,
  type FleetEntry,
  type FleetSort,
  classifyWorkspace,
  countStates,
  orderEntries,
} from './fleet-model.ts';

/**
 * How many workspaces the cards show at once. Beyond this they report the overflow rather than implying
 * the page is the whole fleet; search, the filters and the list view's pages reach the rest.
 */
export const FLEET_PAGE_SIZE = 100;

const NO_WORKSPACES: WorkspaceInterface[] = [];
const NO_RUNS: WorkflowItemInterface[] = [];

/** What the board needs from every workspace's run query, as two parallel arrays. */
interface FleetRuns {
  data: WorkflowItemInterface[][];
  isPending: boolean[];
}

/**
 * Folds the per-workspace query results into {@link FleetRuns}. Declared once, outside the hook: TanStack
 * re-runs `combine` only when a result or the function's reference changes, and structurally shares what it
 * returns, so the fold is stable across renders that change nothing.
 */
function combineRuns(results: UseQueryResult<PaginatedInterface<WorkflowItemInterface>>[]): FleetRuns {
  return {
    data: results.map((result) => result.data?.data ?? NO_RUNS),
    isPending: results.map((result) => result.isPending),
  };
}

/** Which workspaces the board asks for. Every part is answered by the workspace API, not in the browser. */
export interface FleetQuery {
  /** Matches the title or the app name. */
  search?: string;
  appName?: string[];
  favouritesOnly?: boolean;
  /** Workspaces in any of these states, by the same rule that colours the cards. */
  activity?: WorkspaceActivity[];
  /**
   * One page in the API's order, for the list view. Without it the board loads the first
   * {@link FLEET_PAGE_SIZE} workspaces and lays them out in the order the cards were dragged into.
   */
  page?: FleetPage;
}

export interface FleetPage {
  sort: FleetSort;
  /** Zero-based. */
  index: number;
  size: number;
}

/**
 * The API's order for a sort. Title and then id break ties, so a page holds the same workspaces each
 * time it is fetched, however many share an app or a favourite.
 */
export function workspaceSortBy(sort: FleetSort): WorkspaceSortByInterface[] {
  return [
    { field: sort.field, order: sort.order === 'ASC' ? SortOrder.ASC : SortOrder.DESC },
    ...(sort.field === 'title' ? [] : [{ field: 'title', order: SortOrder.ASC }]),
    { field: 'id', order: SortOrder.ASC },
  ];
}

function workspaceFilter(query: FleetQuery): WorkspaceFilterInterface | undefined {
  const filter: WorkspaceFilterInterface = {
    ...(query.appName?.length ? { appName: query.appName } : {}),
    ...(query.favouritesOnly ? { isFavourite: true } : {}),
    ...(query.activity?.length ? { activity: query.activity } : {}),
  };
  return Object.keys(filter).length > 0 ? filter : undefined;
}

export interface Fleet {
  entries: FleetEntry[];
  counts: FleetCounts;
  /** Workspaces the query matches, which exceeds `entries.length` once they outgrow one page. */
  total: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * The board's data: the workspaces the query selects, each with its own active-run query.
 *
 * The cards ask for the first {@link FLEET_PAGE_SIZE} workspaces by title and order them as they were
 * dragged; the list view asks for one page, sorted, and keeps the API's order.
 *
 * One query per workspace rather than one wide run list, because the wide version would have to be a
 * window over recent activity — and a run parked for days has an *old* `updatedAt`, so it is exactly what
 * a newest-N window drops. A workspace waiting on someone must never read as idle.
 *
 * Sub-workflows are included rather than filtered to roots: the run that holds a question is usually a
 * child three levels down, and a root parked on it reads as plain `working`. The model picks the roots
 * back out for the card's headline and its count.
 *
 * Every query is a standard `queries.workflowList`, so the SSE binding (`workflow.*` → the `workflows`
 * key prefix) keeps the whole board live with no plumbing of its own. The same events stale the workspace
 * list, so a workspace whose state changes moves in or out of a list filtered by state.
 */
export function useFleet(query: FleetQuery = {}): Fleet {
  const client = useLoopstackClient();
  const { preferences } = useStudioPreferences();

  const filter = workspaceFilter(query);
  const workspacesQuery = useQuery({
    ...client.queries.workspaceList({
      ...(filter ? { filter } : {}),
      ...(query.search ? { search: query.search } : {}),
      sortBy: workspaceSortBy(query.page?.sort ?? { field: 'title', order: 'ASC' }),
      page: query.page?.index ?? 0,
      limit: query.page?.size ?? FLEET_PAGE_SIZE,
    }),
    // A new search or filter keeps the board on screen until the answer arrives, rather than blanking it.
    placeholderData: keepPreviousData,
  });

  const workspaces = workspacesQuery.data?.data ?? NO_WORKSPACES;

  // One query per workspace, folded into two arrays by `combine`. The fold is a module-level function so
  // TanStack can keep its result referentially stable between renders: a memo below can then depend on the
  // fold itself rather than on a dependency list that grows and shrinks with the number of workspaces.
  const runs = useQueries({
    queries: workspaces.map((workspace) => ({
      ...client.queries.workflowList({
        filter: { workspaceId: workspace.id, status: [...ACTIVE_RUN_STATES] },
        sortBy: [{ field: 'updatedAt', order: SortOrder.DESC }],
      }),
    })),
    combine: combineRuns,
  });

  const runsByWorkspace = useMemo(() => {
    const map = new Map<string, WorkflowItemInterface[]>();
    workspaces.forEach((workspace, index) => {
      map.set(workspace.id, runs.data[index] ?? NO_RUNS);
    });
    return map;
  }, [workspaces, runs.data]);

  const manualOrder = query.page ? undefined : preferences.fleetOrder;
  const entries = useMemo(() => {
    const classified = workspaces.map((workspace, index) =>
      classifyWorkspace(workspace, runsByWorkspace.get(workspace.id) ?? NO_RUNS, runs.isPending[index] ?? false),
    );
    return manualOrder ? orderEntries(classified, manualOrder) : classified;
  }, [workspaces, runsByWorkspace, manualOrder, runs.isPending]);

  return {
    entries,
    counts: useMemo(() => countStates(entries), [entries]),
    total: workspacesQuery.data?.total ?? 0,
    isLoading: workspacesQuery.isPending,
    error: (workspacesQuery.error as Error | null) ?? null,
  };
}
