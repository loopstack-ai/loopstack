import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { WorkflowItemInterface } from '@loopstack/contracts/api';
import { SortOrder } from '@loopstack/contracts/enums';
import { useLoopstackClient } from '@loopstack/react';
import { ACTIVE_RUN_STATES } from '@/lib/run-status.ts';
import { useStudioPreferences } from '@/providers/StudioPreferencesProvider.tsx';
import { type FleetCounts, type FleetEntry, classifyWorkspace, countStates, orderEntries } from './fleet-model.ts';

/**
 * How many workspaces the board shows at once. Beyond this it reports the overflow rather than implying
 * the page is the whole fleet.
 */
export const FLEET_PAGE_SIZE = 100;

export interface Fleet {
  entries: FleetEntry[];
  counts: FleetCounts;
  /** Workspaces in total, which exceeds `entries.length` once the fleet outgrows one page. */
  total: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * The board's data: every workspace, each with its own active-run query.
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
 * key prefix) keeps the whole board live with no plumbing of its own.
 */
export function useFleet(): Fleet {
  const client = useLoopstackClient();
  const { preferences } = useStudioPreferences();

  const workspacesQuery = useQuery({
    ...client.queries.workspaceList({
      sortBy: [{ field: 'title', order: SortOrder.ASC }],
      page: 0,
      limit: FLEET_PAGE_SIZE,
    }),
  });

  const workspaces = workspacesQuery.data?.data ?? [];

  const runQueries = useQueries({
    queries: workspaces.map((workspace) => ({
      ...client.queries.workflowList({
        filter: { workspaceId: workspace.id, status: [...ACTIVE_RUN_STATES] },
        sortBy: [{ field: 'updatedAt', order: SortOrder.DESC }],
      }),
    })),
  });

  const runsByWorkspace = useMemo(() => {
    const map = new Map<string, WorkflowItemInterface[]>();
    workspaces.forEach((workspace, index) => {
      map.set(workspace.id, runQueries[index]?.data?.data ?? []);
    });
    return map;
  }, [workspaces, ...runQueries.map((query) => query.data)]);

  const entries = useMemo(
    () =>
      orderEntries(
        workspaces.map((workspace, index) =>
          classifyWorkspace(workspace, runsByWorkspace.get(workspace.id) ?? [], runQueries[index]?.isPending ?? false),
        ),
        preferences.fleetOrder,
      ),
    [workspaces, runsByWorkspace, preferences.fleetOrder, ...runQueries.map((query) => query.isPending)],
  );

  return {
    entries,
    counts: useMemo(() => countStates(entries), [entries]),
    total: workspacesQuery.data?.total ?? 0,
    isLoading: workspacesQuery.isPending,
    error: (workspacesQuery.error as Error | null) ?? null,
  };
}
