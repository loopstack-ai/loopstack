import type { WorkflowItemInterface, WorkspaceInterface } from '@loopstack/contracts/api';
import { type RunActivity, runActivity } from '@/lib/run-status.ts';

/**
 * What a workspace card reports. `idle` means no active run at all — the dashboard deliberately holds no
 * run history, so a workspace whose last run failed reads as idle here and is found in the runs list.
 */
export type FleetState = 'waiting' | 'working' | 'queued' | 'idle';

/** One card's worth of data: a workspace, the run it headlines, and how many others are active. */
export interface FleetEntry {
  workspace: WorkspaceInterface;
  state: FleetState;
  /** The run the card shows — the most urgent one, by {@link ACTIVITY_PRECEDENCE}. */
  run?: WorkflowItemInterface;
  /** Active runs beyond the headlined one. */
  moreRuns: number;
  /** The workspace's active runs are still loading. */
  isLoading: boolean;
}

/** One row of the attention strip: a run waiting on a person, with the workspace it belongs to. */
export interface AttentionRow {
  workspace: WorkspaceInterface;
  run: WorkflowItemInterface;
}

export interface FleetCounts {
  waiting: number;
  working: number;
  queued: number;
  idle: number;
}

/**
 * Which activity a card headlines when a workspace has several active runs: the one a person must act on
 * wins over the one a machine is handling, and a queued run is the least interesting of the three.
 */
const ACTIVITY_PRECEDENCE: RunActivity[] = ['waiting', 'working', 'queued'];

function olderFirst(a: WorkflowItemInterface, b: WorkflowItemInterface): number {
  return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
}

function newerFirst(a: WorkflowItemInterface, b: WorkflowItemInterface): number {
  return -olderFirst(a, b);
}

/**
 * Builds one workspace's card from its active runs.
 *
 * Within the headlined activity the pick is time-based, and the direction differs by what the time means:
 * for a run waiting on a person, the longest wait is the one worth surfacing; for a working run, the most
 * recent write is the one that says where the workspace actually is.
 */
export function classifyWorkspace(
  workspace: WorkspaceInterface,
  runs: WorkflowItemInterface[],
  isLoading = false,
): FleetEntry {
  const byActivity = new Map<RunActivity, WorkflowItemInterface[]>();
  for (const run of runs) {
    const activity = runActivity(run);
    const bucket = byActivity.get(activity);
    if (bucket) bucket.push(run);
    else byActivity.set(activity, [run]);
  }

  for (const activity of ACTIVITY_PRECEDENCE) {
    const bucket = byActivity.get(activity);
    if (!bucket || bucket.length === 0) continue;
    const sorted = [...bucket].sort(activity === 'working' ? newerFirst : olderFirst);
    return {
      workspace,
      state: activity,
      run: sorted[0],
      moreRuns: runs.length - 1,
      isLoading,
    };
  }

  return { workspace, state: 'idle', moreRuns: 0, isLoading };
}

/**
 * The board's order: whatever it was dragged into, then anything unplaced — favourites first, then by title.
 *
 * Deliberately **not** ordered by state in either case: a grid whose cards jump on every transition is
 * unreadable exactly when the fleet is busy. Urgency is the attention strip's job, and the counters'.
 * A workspace created after the last drag has no saved rank, so it joins the tail rather than displacing
 * a board someone arranged by hand.
 */
export function orderEntries(entries: FleetEntry[], manualOrder: string[] = []): FleetEntry[] {
  const rank = new Map(manualOrder.map((id, index) => [id, index]));
  return [...entries].sort((a, b) => {
    const rankA = rank.get(a.workspace.id);
    const rankB = rank.get(b.workspace.id);
    if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
    if (rankA !== undefined) return -1;
    if (rankB !== undefined) return 1;
    if (a.workspace.isFavourite !== b.workspace.isFavourite) return a.workspace.isFavourite ? -1 : 1;
    return a.workspace.title.localeCompare(b.workspace.title);
  });
}

/** Moves `id` to where `targetId` sits, returning the full order to save. */
export function reorderIds(ids: string[], id: string, targetId: string): string[] {
  const from = ids.indexOf(id);
  const to = ids.indexOf(targetId);
  if (from === -1 || to === -1 || from === to) return ids;
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}

/** Every run waiting on a person, longest wait first — the rows of the attention strip. */
export function attentionRows(
  entries: FleetEntry[],
  runsByWorkspace: Map<string, WorkflowItemInterface[]>,
): AttentionRow[] {
  const rows: AttentionRow[] = [];
  for (const entry of entries) {
    for (const run of runsByWorkspace.get(entry.workspace.id) ?? []) {
      if (runActivity(run) === 'waiting') rows.push({ workspace: entry.workspace, run });
    }
  }
  return rows.sort((a, b) => olderFirst(a.run, b.run));
}

/** How many workspaces are in each state — the one-line summary above the board. */
export function countStates(entries: FleetEntry[]): FleetCounts {
  const counts: FleetCounts = { waiting: 0, working: 0, queued: 0, idle: 0 };
  for (const entry of entries) counts[entry.state] += 1;
  return counts;
}
