import { describe, expect, it } from 'vitest';
import { type Inventory, WorkspaceInventoryService } from '../workspace-inventory.service.js';

const WS_LIVE = '11111111-1111-1111-1111-111111111111';
const WS_DELETED = '22222222-2222-2222-2222-222222222222';
const WF_LIVE = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const WF_DELETED = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const WS_STRAY = '33333333-3333-3333-3333-333333333333';

/** orphanPlan + rendering are pure over an Inventory — no DI needed. */
function service(): WorkspaceInventoryService {
  return new WorkspaceInventoryService(undefined as never, undefined as never, undefined as never);
}

function inventory(): Inventory {
  return {
    workspaces: [
      {
        workspaceId: WS_LIVE,
        existsInDb: true,
        unrecognized: false,
        title: 'Engineer',
        appName: 'engineer_worker_app',
        sizeBytes: 5 * 1024 ** 3,
        checkouts: [
          {
            workflowId: WF_LIVE,
            existsInDb: true,
            status: 'completed',
            sizeBytes: 1024 ** 3,
            modifiedAt: '2026-09-10T00:00:00.000Z',
          },
          {
            workflowId: WF_DELETED,
            existsInDb: false,
            sizeBytes: 2 * 1024 ** 3,
            modifiedAt: '2026-09-01T00:00:00.000Z',
          },
        ],
      },
      {
        workspaceId: WS_DELETED,
        existsInDb: false,
        unrecognized: false,
        sizeBytes: 8 * 1024 ** 3,
        checkouts: [],
      },
      // A foreign directory someone put into the state dir — reported, never reclaimed.
      {
        workspaceId: 'not-a-uuid',
        existsInDb: false,
        unrecognized: true,
        sizeBytes: 1024,
        checkouts: [],
      },
    ],
    containers: [
      // Stray container of a workspace with NO state dir left — its workspace row is gone too.
      { id: 'c1', name: 'x', workspaceId: WS_STRAY, workflowId: 'base', running: false, orphaned: true },
      { id: 'c2', name: 'y', workspaceId: WS_LIVE, workflowId: WF_LIVE, running: true, orphaned: false },
    ],
    volumes: [
      // dind cache of a deleted run inside a live workspace.
      {
        name: `loopstack-engineer-dind-${WS_LIVE}-${WF_DELETED}-agent`,
        workspaceId: WS_LIVE,
        workflowId: WF_DELETED,
        orphaned: true,
      },
    ],
  };
}

const KNOWN = 'known0000000000';
const LEFTOVER = 'leftover00000000';

/** The shared section a full (unscoped) scan reads: two bases, one of which no template provisions. */
function withBases(options: { locked?: boolean; referenced?: boolean } = {}): Inventory {
  return {
    ...inventory(),
    shared: {
      bases: [
        {
          baseKey: KNOWN,
          sizeBytes: 40 * 1024 ** 3,
          locked: false,
          generations: [{ generation: 'gen-1', sizeBytes: 40 * 1024 ** 3, current: true, referenced: false }],
        },
        {
          baseKey: LEFTOVER,
          sizeBytes: 19 * 1024 ** 3,
          locked: options.locked ?? false,
          generations: [
            { generation: 'gen-9', sizeBytes: 19 * 1024 ** 3, current: true, referenced: options.referenced ?? false },
          ],
        },
      ],
      seedImagesBytes: 2 * 1024 ** 3,
      npmCacheBytes: 1024 ** 3,
    },
  };
}

describe('WorkspaceInventoryService.orphanPlan', () => {
  it('plans workspace-level reclaim for deleted workspaces and docker strays, checkout-level for deleted runs', () => {
    const plan = service().orphanPlan(inventory());

    // WS_DELETED (state dir, row gone) and WS_STRAY (docker leftovers only, row gone) — never the live one.
    expect(plan.workspaceIds.sort()).toEqual([WS_DELETED, WS_STRAY].sort());
    // The deleted run's checkout + its dind volume collapse into one checkout-level entry.
    expect(plan.checkouts).toEqual([{ workspaceId: WS_LIVE, workflowId: WF_DELETED }]);
  });

  it('never reclaims unrecognized (non-id) directories', () => {
    const plan = service().orphanPlan(inventory());
    expect(plan.workspaceIds).not.toContain('not-a-uuid');
  });

  it('renders the plan and inventory without throwing', () => {
    const inv = inventory();
    const svc = service();
    const plan = svc.orphanPlan(inv);
    expect(svc.renderInventory(inv)).toContain('orphaned');
    expect(svc.renderOrphanPlan(inv, plan)).toContain(WS_DELETED);
  });
});

describe('WorkspaceInventoryService.orphanPlan — left-over bases', () => {
  it('proposes a base no template provisions, and never the one that is current', () => {
    // Generation collection keeps every base's published generation, so a base whose provision config
    // changed is reclaimed by nothing else.
    const plan = service().orphanPlan(withBases(), [KNOWN]);
    expect(plan.bases).toEqual([LEFTOVER]);
  });

  it('proposes nothing while the base is being provisioned', () => {
    expect(service().orphanPlan(withBases({ locked: true }), [KNOWN]).bases).toEqual([]);
  });

  it('proposes nothing while a live checkout reads one of its generations', () => {
    expect(service().orphanPlan(withBases({ referenced: true }), [KNOWN]).bases).toEqual([]);
  });

  it('proposes no base at all when the keys are unknown — a scoped scan reads no shared state', () => {
    // Called without the template keys, every base would look left over; the default must be to propose none.
    expect(service().orphanPlan(withBases()).bases).toEqual([]);
    expect(service().orphanPlan(inventory(), [KNOWN]).bases).toEqual([]);
  });

  it('says in the inventory which base no template provisions', () => {
    const rendered = service().renderInventory(withBases(), [KNOWN]);
    expect(rendered).toContain('no template provisions it');
    expect(rendered.split('\n').filter((line) => line.includes('no template provisions it'))).toHaveLength(1);
  });

  it('lists the base in the plan it asks you to confirm', () => {
    const inv = withBases();
    const svc = service();
    expect(svc.renderOrphanPlan(inv, svc.orphanPlan(inv, [KNOWN]))).toContain(LEFTOVER);
  });
});
