import { describe, expect, it } from 'vitest';
import type { WorkflowItemInterface, WorkspaceInterface } from '@loopstack/contracts/api';
import { WorkflowState } from '@loopstack/contracts/enums';
import { attentionRows, classifyWorkspace, countStates, orderEntries, reorderIds } from './fleet-model.ts';

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
    ...overrides,
  };
}

const waiting = (updatedAt: string, extra: Partial<WorkflowItemInterface> = {}) =>
  run({ status: WorkflowState.Waiting, activeChildren: 0, updatedAt, ...extra });
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
    const parked = run({ status: WorkflowState.Waiting, activeChildren: 2, updatedAt: '2026-10-01T09:00:00.000Z' });
    expect(classifyWorkspace(workspace('ws-1'), [parked]).state).toBe('working');
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

describe('attentionRows', () => {
  it('lists every run waiting on a person, longest wait first, across workspaces', () => {
    const runsByWorkspace = new Map<string, WorkflowItemInterface[]>([
      [
        'ws-1',
        [
          waiting('2026-10-01T09:00:00.000Z', { id: 'recent', workspaceId: 'ws-1' }),
          working('2026-10-01T09:30:00.000Z', { id: 'busy', workspaceId: 'ws-1' }),
        ],
      ],
      ['ws-2', [waiting('2026-09-28T09:00:00.000Z', { id: 'forgotten', workspaceId: 'ws-2' })]],
    ]);
    const entries = [
      classifyWorkspace(workspace('ws-1'), runsByWorkspace.get('ws-1') ?? []),
      classifyWorkspace(workspace('ws-2'), runsByWorkspace.get('ws-2') ?? []),
    ];

    expect(attentionRows(entries, runsByWorkspace).map((row) => row.run.id)).toEqual(['forgotten', 'recent']);
  });

  it('is empty when nothing waits on a person', () => {
    const runsByWorkspace = new Map([['ws-1', [working('2026-10-01T09:00:00.000Z')]]]);
    const entries = [classifyWorkspace(workspace('ws-1'), runsByWorkspace.get('ws-1') ?? [])];
    expect(attentionRows(entries, runsByWorkspace)).toEqual([]);
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
