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
  /**
   * The run `run` descends from, when it is a sub-workflow — the thing that was actually started.
   * A prompt three levels down says nothing about what it is part of, so the card shows both.
   */
  rootRun?: WorkflowItemInterface;
  /** Active runs beyond the headlined one. */
  moreRuns: number;
  /** The workspace's active runs are still loading. */
  isLoading: boolean;
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
 * The runs that *started* here: no parent, or a parent outside the set we fetched (a run queued in from
 * another workspace). What a person counts when they ask how much this workspace has going on — the
 * sub-workflows under each one are machinery, not separate work.
 */
function rootRuns(runs: WorkflowItemInterface[]): WorkflowItemInterface[] {
  const ids = new Set(runs.map((run) => run.id));
  return runs.filter((run) => !run.parentId || !ids.has(run.parentId));
}

/**
 * Walks up to the run `item` descends from, or `undefined` when it is already one.
 *
 * Only the top of the chain is returned, not every level: the card answers "what is this part of", and the
 * levels between are orchestration nobody opens. The walk stops at the edge of the set, so a run queued in
 * from another workspace reports no root — its parent is somewhere this board is not looking.
 */
export function rootOf(runs: WorkflowItemInterface[], item: WorkflowItemInterface): WorkflowItemInterface | undefined {
  const byId = new Map(runs.map((run) => [run.id, run]));
  let current = item;
  const seen = new Set([current.id]);

  while (current.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent || seen.has(parent.id)) break;
    seen.add(parent.id);
    current = parent;
  }

  return current.id === item.id ? undefined : current;
}

/**
 * Builds one workspace's card from its active runs, sub-workflows included.
 *
 * A question is usually held by a child several levels down, while its root sits there `waiting` with
 * children active — indistinguishable from real work if only roots are read. So the state is decided over
 * the whole set, and when something waits on a person the card headlines *that* run: its place is the one
 * worth reading (`awaiting_approval`, not the root's `running`).
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
  // Counted over roots, so a run with four sub-workflows does not read as five.
  const moreRuns = Math.max(rootRuns(runs).length - 1, 0);

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
    const run = sorted[0];
    return {
      workspace,
      state: activity,
      run,
      rootRun: rootOf(runs, run),
      moreRuns,
      isLoading,
    };
  }

  return { workspace, state: 'idle', moreRuns: 0, isLoading };
}

/**
 * The board's order: whatever it was dragged into, then anything unplaced — favourites first, then by title.
 *
 * Deliberately **not** ordered by state in either case: a grid whose cards jump on every transition is
 * unreadable exactly when the fleet is busy. Urgency is carried by each card's own state and the counter
 * line, which hold still.
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

/** How many workspaces are in each state — the one-line summary above the board. */
export function countStates(entries: FleetEntry[]): FleetCounts {
  const counts: FleetCounts = { waiting: 0, working: 0, queued: 0, idle: 0 };
  for (const entry of entries) counts[entry.state] += 1;
  return counts;
}
