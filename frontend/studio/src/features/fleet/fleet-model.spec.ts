import { describe, expect, it } from 'vitest';
import type { WorkflowItemInterface, WorkspaceInterface } from '@loopstack/contracts/api';
import { WorkflowState } from '@loopstack/contracts/enums';
import { classifyWorkspace, countStates, orderEntries, reorderIds, rootOf } from './fleet-model.ts';

function workspace(id: string, title = id, isFavourite = false): WorkspaceInterface {
  return {
    id,
    title,
    appName: 'demo',
    isFavourite,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  };
}

function run(
  overrides: Partial<WorkflowItemInterface> & { status: WorkflowState; updatedAt: string },
): WorkflowItemInterface {
  return {
    id: overrides.id ?? 'wf-1',
    workflowName: overrides.workflowName ?? 'Workflow',
    title: null,
    run: overrides.run ?? 1,
    labels: [],
    hasError: false,
    place: overrides.place ?? 'step',
    createdAt: '2026-10-01T08:00:00.000Z',
    workspaceId: overrides.workspaceId ?? 'ws-1',
    parentId: null,
    hasChildren: 0,
    activeChildren: overrides.activeChildren ?? 0,
    availableTransitions: overrides.availableTransitions ?? null,
    ...overrides,
  };
}

/** A transition the engine holds for a submitted payload — what makes a park a question. */
const MANUAL = [{ id: 'submit', from: 'step', to: 'end', trigger: 'manual' as const }];

const waiting = (updatedAt: string, extra: Partial<WorkflowItemInterface> = {}) =>
  run({ status: WorkflowState.Waiting, activeChildren: 0, availableTransitions: MANUAL, updatedAt, ...extra });
const working = (updatedAt: string, extra: Partial<WorkflowItemInterface> = {}) =>
  run({ status: WorkflowState.Running, updatedAt, ...extra });
const queued = (updatedAt: string, extra: Partial<WorkflowItemInterface> = {}) =>
  run({ status: WorkflowState.Pending, updatedAt, ...extra });

describe('classifyWorkspace', () => {
  it('reports idle when nothing is active', () => {
    const entry = classifyWorkspace(workspace('ws-1'), []);
    expect(entry.state).toBe('idle');
    expect(entry.run).toBeUndefined();
    expect(entry.moreRuns).toBe(0);
  });

  it('treats a run parked on its children as working, not as waiting on a person', () => {
    const parked = run({
      status: WorkflowState.Waiting,
      activeChildren: 2,
      availableTransitions: MANUAL,
      updatedAt: '2026-10-01T09:00:00.000Z',
    });
    // It offers a manual transition — you *may* interject — but nothing is blocked on you.
    expect(classifyWorkspace(workspace('ws-1'), [parked]).state).toBe('working');
  });

  it('does not call a park without a manual transition a question', () => {
    // A run parked between automatic retries: stopped, nothing below it, but nobody is being asked.
    const retrying = run({
      status: WorkflowState.Waiting,
      activeChildren: 0,
      availableTransitions: [{ id: 'retry', from: 'step', to: 'step' }],
      updatedAt: '2026-10-01T09:00:00.000Z',
    });
    expect(classifyWorkspace(workspace('ws-1'), [retrying]).state).toBe('working');
  });

  it('headlines a waiting sub-workflow over the root parked on it', () => {
    const root = run({
      id: 'root',
      status: WorkflowState.Waiting,
      activeChildren: 1,
      place: 'running',
      updatedAt: '2026-10-01T10:00:00.000Z',
    });
    const child = waiting('2026-10-01T09:00:00.000Z', {
      id: 'child',
      parentId: 'root',
      place: 'awaiting_approval',
    });

    const entry = classifyWorkspace(workspace('ws-1'), [root, child]);

    expect(entry.state).toBe('waiting');
    expect(entry.run?.id).toBe('child');
    // The place worth reading is the child's, not the root's.
    expect(entry.run?.place).toBe('awaiting_approval');
    // ...and the card still says what it is part of, so the root can be opened instead.
    expect(entry.rootRun?.id).toBe('root');
  });

  it('counts roots, not the sub-workflows under them', () => {
    const root = run({ id: 'root', status: WorkflowState.Running, updatedAt: '2026-10-01T10:00:00.000Z' });
    const child = run({
      id: 'child',
      parentId: 'root',
      status: WorkflowState.Running,
      updatedAt: '2026-10-01T10:00:00.000Z',
    });
    const other = run({ id: 'other', status: WorkflowState.Running, updatedAt: '2026-10-01T09:00:00.000Z' });

    expect(classifyWorkspace(workspace('ws-1'), [root, child, other]).moreRuns).toBe(1);
  });

  it('headlines the run a person must act on over one a machine is handling', () => {
    const entry = classifyWorkspace(workspace('ws-1'), [
      working('2026-10-01T10:00:00.000Z', { id: 'busy' }),
      waiting('2026-10-01T09:00:00.000Z', { id: 'parked' }),
      queued('2026-10-01T10:30:00.000Z', { id: 'queued' }),
    ]);
    expect(entry.state).toBe('waiting');
    expect(entry.run?.id).toBe('parked');
    expect(entry.moreRuns).toBe(2);
  });

  it('picks the longest wait among waiting runs, and the latest write among working ones', () => {
    const parked = classifyWorkspace(workspace('ws-1'), [
      waiting('2026-10-01T09:00:00.000Z', { id: 'recent' }),
      waiting('2026-09-29T09:00:00.000Z', { id: 'forgotten' }),
    ]);
    expect(parked.run?.id).toBe('forgotten');

    const busy = classifyWorkspace(workspace('ws-1'), [
      working('2026-10-01T09:00:00.000Z', { id: 'older' }),
      working('2026-10-01T11:00:00.000Z', { id: 'latest' }),
    ]);
    expect(busy.run?.id).toBe('latest');
  });

  it('falls back to queued only when nothing else is active', () => {
    const entry = classifyWorkspace(workspace('ws-1'), [queued('2026-10-01T09:00:00.000Z')]);
    expect(entry.state).toBe('queued');
  });
});

describe('rootOf', () => {
  const root = run({ id: 'root', status: WorkflowState.Running, updatedAt: '2026-10-01T09:00:00.000Z' });
  const middle = run({
    id: 'middle',
    parentId: 'root',
    status: WorkflowState.Running,
    updatedAt: '2026-10-01T09:00:00.000Z',
  });
  const leaf = run({
    id: 'leaf',
    parentId: 'middle',
    status: WorkflowState.Running,
    updatedAt: '2026-10-01T09:00:00.000Z',
  });

  it('walks past the levels in between to the run that was started', () => {
    expect(rootOf([root, middle, leaf], leaf)?.id).toBe('root');
  });

  it('reports nothing for a run that is already a root', () => {
    expect(rootOf([root, middle, leaf], root)).toBeUndefined();
  });

  it('stops at the edge of the set, so a run queued in from elsewhere reports none', () => {
    // Its parent lives in another workspace — not something this board fetched.
    const queuedIn = run({
      id: 'queued-in',
      parentId: 'somewhere-else',
      status: WorkflowState.Running,
      updatedAt: '2026-10-01T09:00:00.000Z',
    });
    expect(rootOf([queuedIn], queuedIn)).toBeUndefined();
  });
});

describe('orderEntries', () => {
  it('orders favourites first, then by title — never by state', () => {
    const entries = [
      classifyWorkspace(workspace('c', 'Charlie'), [waiting('2026-10-01T09:00:00.000Z')]),
      classifyWorkspace(workspace('a', 'Alpha'), []),
      classifyWorkspace(workspace('b', 'Bravo', true), []),
    ];
    expect(orderEntries(entries).map((entry) => entry.workspace.title)).toEqual(['Bravo', 'Alpha', 'Charlie']);
  });

  it('keeps a card in place when its state changes', () => {
    const before = orderEntries([
      classifyWorkspace(workspace('a', 'Alpha'), [working('2026-10-01T09:00:00.000Z')]),
      classifyWorkspace(workspace('b', 'Bravo'), []),
    ]);
    const after = orderEntries([
      classifyWorkspace(workspace('a', 'Alpha'), []),
      classifyWorkspace(workspace('b', 'Bravo'), [waiting('2026-10-01T09:00:00.000Z')]),
    ]);
    expect(after.map((entry) => entry.workspace.id)).toEqual(before.map((entry) => entry.workspace.id));
  });
});

describe('orderEntries with a hand-arranged order', () => {
  const entries = () => [
    classifyWorkspace(workspace('a', 'Alpha'), []),
    classifyWorkspace(workspace('b', 'Bravo', true), []),
    classifyWorkspace(workspace('c', 'Charlie'), []),
  ];

  it('follows the saved order, favourites included', () => {
    expect(orderEntries(entries(), ['c', 'a', 'b']).map((entry) => entry.workspace.id)).toEqual(['c', 'a', 'b']);
  });

  it('appends workspaces with no saved rank, in the default order', () => {
    // 'b' is a favourite but unplaced, so it leads the tail rather than the board.
    expect(orderEntries(entries(), ['c']).map((entry) => entry.workspace.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('reorderIds', () => {
  it('moves an id to the target position, in both directions', () => {
    expect(reorderIds(['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'c', 'a']);
    expect(reorderIds(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b']);
  });

  it('returns the original list when the move changes nothing', () => {
    const ids = ['a', 'b', 'c'];
    expect(reorderIds(ids, 'b', 'b')).toBe(ids);
    expect(reorderIds(ids, 'b', 'zzz')).toBe(ids);
  });
});

describe('countStates', () => {
  it('counts workspaces per state', () => {
    const counts = countStates([
      classifyWorkspace(workspace('a'), [waiting('2026-10-01T09:00:00.000Z')]),
      classifyWorkspace(workspace('b'), [working('2026-10-01T09:00:00.000Z')]),
      classifyWorkspace(workspace('c'), [queued('2026-10-01T09:00:00.000Z')]),
      classifyWorkspace(workspace('d'), []),
      classifyWorkspace(workspace('e'), []),
    ]);
    expect(counts).toEqual({ waiting: 1, working: 1, queued: 1, idle: 2 });
  });
});
