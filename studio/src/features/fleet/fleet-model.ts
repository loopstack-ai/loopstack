import type { WorkflowItemInterface, WorkspaceInterface } from '@loopstack/contracts/api';
import { type RunActivity, runActivity } from '@/lib/run-status.ts';

/**
 * What a workspace card reports. `idle` means no active run at all — the dashboard deliberately holds no
 * run history, so a workspace whose last run failed reads as idle here and is found in the runs list.
 */
export type FleetState = 'waiting' | 'working' | 'queued' | 'idle';

/**
 * One active run on a card: the run that was started, and — when the state is held further down — the
 * descendant actually holding it. A prompt three levels in says nothing about what it is part of, so the
 * card shows both and lets either be opened.
 */
export interface FleetRunLine {
  root: WorkflowItemInterface;
  /** The descendant carrying `state`, absent when that is the root itself. */
  active?: WorkflowItemInterface;
  state: RunActivity;
}

/** One card's worth of data: a workspace and everything active in it. */
export interface FleetEntry {
  workspace: WorkspaceInterface;
  /** The workspace's own verdict — the most urgent of its runs, or `idle` with none. */
  state: FleetState;
  /** Every run started here that has not finished, most urgent first. */
  runs: FleetRunLine[];
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
 * Which activity speaks for a run, and which run leads a card, when several compete: the one a person must
 * act on wins over the one a machine is handling, and a queued run is the least interesting of the three.
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
 * The run that speaks for a set: the most urgent by {@link ACTIVITY_PRECEDENCE}, and within that the one
 * whose time means the most — for a run waiting on a person the longest wait, for a working one the most
 * recent write, which is where the work actually is.
 */
function leadRun(runs: WorkflowItemInterface[]): { run: WorkflowItemInterface; state: RunActivity } | undefined {
  for (const activity of ACTIVITY_PRECEDENCE) {
    const bucket = runs.filter((run) => runActivity(run) === activity);
    if (bucket.length === 0) continue;
    const sorted = [...bucket].sort(activity === 'working' ? newerFirst : olderFirst);
    return { run: sorted[0], state: activity };
  }
  return undefined;
}

/**
 * Builds one workspace's card from its active runs, sub-workflows included.
 *
 * Grouped by the run each descends from, because that is the unit a person started and thinks in: a root
 * with four sub-workflows is one piece of work, not five. Within a group the state comes from whichever
 * run holds it — usually a child, since a root parked on one sits there `waiting` with children active and
 * would otherwise read as plain work.
 */
export function classifyWorkspace(
  workspace: WorkspaceInterface,
  runs: WorkflowItemInterface[],
  isLoading = false,
): FleetEntry {
  const lines: FleetRunLine[] = [];

  for (const root of rootRuns(runs)) {
    const subtree = runs.filter((run) => run.id === root.id || rootOf(runs, run)?.id === root.id);
    const lead = leadRun(subtree);
    if (!lead) continue;
    lines.push({
      root,
      active: lead.run.id === root.id ? undefined : lead.run,
      state: lead.state,
    });
  }

  // Precedence first, then the same time rule the lead run follows — otherwise two parked pieces of work
  // would sit in fetch order and the one forgotten since Tuesday could land below today's.
  lines.sort((a, b) => {
    const byState = ACTIVITY_PRECEDENCE.indexOf(a.state) - ACTIVITY_PRECEDENCE.indexOf(b.state);
    if (byState !== 0) return byState;
    const [left, right] = [a.active ?? a.root, b.active ?? b.root];
    return a.state === 'working' ? newerFirst(left, right) : olderFirst(left, right);
  });

  return {
    workspace,
    state: lines[0]?.state ?? 'idle',
    runs: lines,
    isLoading,
  };
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
