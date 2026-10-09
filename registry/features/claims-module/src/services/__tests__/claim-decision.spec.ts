import { describe, expect, it } from 'vitest';
import type { ClaimHolder, RequestedResource } from '../../interfaces/index.js';
import { decideClaims, freeUnits, scopeTargetOf } from '../claim-decision.js';

const WS = 'ws-1';

function want(overrides: Partial<RequestedResource> = {}): RequestedResource {
  return {
    key: 'area:core',
    mode: 'exclusive',
    scope: 'workflow',
    workspaceId: WS,
    scopeWorkflowId: 'run-1',
    ...overrides,
  };
}

function holder(overrides: Partial<ClaimHolder> = {}): ClaimHolder {
  return {
    claimId: 'claim-1',
    key: 'area:core',
    mode: 'exclusive',
    scope: 'workflow',
    workspaceId: WS,
    scopeWorkflowId: 'run-other',
    since: new Date('2026-01-01'),
    ...overrides,
  };
}

/** Every key has capacity 1 unless this says otherwise — the module's own default. */
const capacity =
  (map: Record<string, number | null> = {}) =>
  (key: string) =>
    key in map ? map[key] : 1;

describe('scope target', () => {
  it('is the run for a workflow claim and the workspace for a workspace claim', () => {
    expect(scopeTargetOf({ scope: 'workflow', workspaceId: WS, scopeWorkflowId: 'run-1' })).toBe('workflow:run-1');
    expect(scopeTargetOf({ scope: 'workspace', workspaceId: WS, scopeWorkflowId: 'run-1' })).toBe('workspace:ws-1');
  });
});

describe('exclusive claims', () => {
  it('are granted when nothing holds the resource', () => {
    const decision = decideClaims([want()], [], capacity());
    expect(decision.grant).toHaveLength(1);
    expect(decision.blocked).toEqual([]);
  });

  it('are blocked by any other holder, shared ones included', () => {
    const decision = decideClaims([want()], [holder({ mode: 'shared' })], capacity({ 'area:core': null }));
    expect(decision.grant).toEqual([]);
    expect(decision.blocked[0]).toMatchObject({
      key: 'area:core',
      holders: [expect.objectContaining({ mode: 'shared' })],
    });
  });

  it('block others whatever the capacity — exclusive is not a unit of a pool', () => {
    const decision = decideClaims(
      [want({ mode: 'shared' })],
      [holder({ mode: 'exclusive' })],
      capacity({ 'area:core': 10 }),
    );
    expect(decision.blocked[0].reason).toContain('exclusively');
  });
});

describe('shared claims', () => {
  it('coexist up to the capacity', () => {
    const live = [
      holder({ mode: 'shared', scopeWorkflowId: 'run-a' }),
      holder({ mode: 'shared', scopeWorkflowId: 'run-b' }),
    ];
    const decision = decideClaims([want({ mode: 'shared' })], live, capacity({ 'area:core': 3 }));
    expect(decision.grant).toHaveLength(1);
  });

  it('are blocked when the capacity is full', () => {
    const live = [
      holder({ mode: 'shared', scopeWorkflowId: 'run-a' }),
      holder({ mode: 'shared', scopeWorkflowId: 'run-b' }),
    ];
    const decision = decideClaims([want({ mode: 'shared' })], live, capacity({ 'area:core': 2 }));
    expect(decision.blocked[0].reason).toContain('at capacity (2 of 2)');
  });

  it('are never blocked by capacity when it is unlimited', () => {
    const live = Array.from({ length: 50 }, (_, index) =>
      holder({ mode: 'shared', scopeWorkflowId: `other-${index}` }),
    );
    const decision = decideClaims([want({ mode: 'shared' })], live, capacity({ 'area:core': null }));
    expect(decision.grant).toHaveLength(1);
  });
});

describe('idempotence per key and scope target', () => {
  it('reports a claim the same owner already holds as held, and writes nothing', () => {
    const live = [holder({ scopeWorkflowId: 'run-1' })];
    const decision = decideClaims([want()], live, capacity());

    expect(decision.held).toHaveLength(1);
    expect(decision.grant).toEqual([]);
    expect(decision.blocked).toEqual([]);
  });

  it('is what lets the fleet claim at dispatch and the run claim again at startup', () => {
    // Exactly the sequence in the concept: the coordinator claims the areas scoped to the run it queued,
    // then the run claims the same keys for itself and must not be told the resource is taken.
    const fleet = decideClaims([want()], [], capacity());
    expect(fleet.grant).toHaveLength(1);

    const asClaimed = [holder({ scopeWorkflowId: 'run-1' })];
    const run = decideClaims([want()], asClaimed, capacity());
    expect(run.held).toHaveLength(1);
    expect(run.blocked).toEqual([]);
  });

  it('counts a workspace-scoped claim once, so a pool unit cannot be taken twice by one workspace', () => {
    const live = [
      holder({ key: 'engineer:checkouts', mode: 'shared', scope: 'workspace', scopeWorkflowId: undefined }),
    ];
    const decision = decideClaims(
      [want({ key: 'engineer:checkouts', mode: 'shared', scope: 'workspace', scopeWorkflowId: undefined })],
      live,
      capacity({ 'engineer:checkouts': 6 }),
    );
    expect(decision.held).toHaveLength(1);
    expect(decision.grant).toEqual([]);
  });

  it('refuses to change the mode of a claim its owner already holds', () => {
    const live = [holder({ scopeWorkflowId: 'run-1', mode: 'shared' })];
    const decision = decideClaims([want({ mode: 'exclusive' })], live, capacity({ 'area:core': null }));
    expect(decision.blocked[0].reason).toContain('cannot be changed');
  });
});

describe('a request as a whole', () => {
  it('grants every resource or none', () => {
    const live = [holder({ key: 'pkg:b' })];
    const decision = decideClaims(
      [want({ key: 'pkg:a' }), want({ key: 'pkg:b' }), want({ key: 'pkg:c' })],
      live,
      capacity(),
    );
    // The caller treats any blocker as a failed request; the decision still says which one it was.
    expect(decision.blocked.map((entry) => entry.key)).toEqual(['pkg:b']);
  });

  it('does not contradict itself: one request cannot take one exclusive key for two owners', () => {
    const decision = decideClaims(
      [want({ scopeWorkflowId: 'run-1' }), want({ scopeWorkflowId: 'run-2' })],
      [],
      capacity(),
    );
    expect(decision.grant).toHaveLength(1);
    expect(decision.blocked).toHaveLength(1);
  });

  it('mixes scopes in one decision, which is what a dispatch takes', () => {
    const decision = decideClaims(
      [
        want({ key: 'engineer:checkouts', mode: 'shared', scope: 'workspace', scopeWorkflowId: undefined }),
        want({ key: 'engineer:runs', mode: 'shared' }),
        want({ key: 'area:core', mode: 'shared' }),
        want({ key: 'pkg:@loopstack/core' }),
      ],
      [],
      capacity({ 'engineer:checkouts': 12, 'engineer:runs': 6, 'area:core': null }),
    );
    expect(decision.grant).toHaveLength(4);
    expect(decision.blocked).toEqual([]);
  });

  it('refuses a workflow-scoped resource with no run to follow', () => {
    expect(() => decideClaims([want({ scopeWorkflowId: undefined })], [], capacity())).toThrow(/scopeWorkflowId/);
  });
});

describe('free units', () => {
  it('counts what is left of a pool', () => {
    expect(freeUnits([holder({ mode: 'shared' })], 3)).toBe(2);
  });

  it('is none while an exclusive holder has it, whatever the capacity', () => {
    expect(freeUnits([holder({ mode: 'exclusive' })], 10)).toBe(0);
  });

  it('is unknown for an unlimited resource', () => {
    expect(freeUnits([holder({ mode: 'shared' })], null)).toBeNull();
  });
});
