import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CAPACITY } from '../../claims.constants.js';
import { ResourceClaimService } from '../resource-claim.service.js';

function service(resources?: { key: string; capacity?: number | null }[]) {
  const update = vi.fn().mockResolvedValue({ affected: 2 });
  const find = vi.fn().mockResolvedValue([]);
  const getMany = vi.fn().mockResolvedValue([]);
  const createQueryBuilder = vi.fn(() => {
    const qb = { where: () => qb, andWhere: () => qb, getMany };
    return qb;
  });
  const transaction = vi.fn();
  const instance = new ResourceClaimService({ update, find, createQueryBuilder } as never, { transaction } as never, {
    resources,
  });
  return { instance, update, find, getMany, transaction };
}

describe('capacity', () => {
  it('is one for a key nothing declared — which is what makes a key usable on demand', () => {
    const { instance } = service();
    expect(instance.capacityOf('pkg:@loopstack/core')).toBe(DEFAULT_CAPACITY);
    expect(instance.capacityOf('area:234')).toBe(1);
  });

  it('comes from the configuration, including unlimited', () => {
    const { instance } = service([
      { key: 'engineer:runs', capacity: 6 },
      { key: 'area:core', capacity: null },
    ]);
    expect(instance.capacityOf('engineer:runs')).toBe(6);
    expect(instance.capacityOf('area:core')).toBeNull();
  });

  it('treats a declared key with no capacity as the default', () => {
    const { instance } = service([{ key: 'engineer:allocator' }]);
    expect(instance.capacityOf('engineer:allocator')).toBe(1);
  });
});

describe('claim', () => {
  it('takes no transaction for an empty request', async () => {
    const { instance, transaction } = service();
    await expect(instance.claim({ resources: [] })).resolves.toEqual({ claimed: true, claims: [] });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('locks every resource key once, in sorted order', async () => {
    // Sorted because two multi-key requests locking in different orders would deadlock each other; once
    // because a repeated key in one request is still one resource.
    const query = vi.fn().mockResolvedValue(undefined);
    const { instance, transaction } = service();
    transaction.mockImplementation(async (work: (m: unknown) => Promise<unknown>) =>
      work({
        query,
        getRepository: () => ({
          createQueryBuilder: () => ({ where: thisQb, andWhere: thisQb, getMany: async () => [] }),
        }),
        save: async () => [],
      }),
    );
    function thisQb(this: unknown) {
      return { where: thisQb, andWhere: thisQb, getMany: async () => [] };
    }

    await instance.claim({
      resources: [
        { key: 'pkg:b', mode: 'exclusive', scope: 'workflow', workspaceId: 'ws', scopeWorkflowId: 'run' },
        { key: 'pkg:a', mode: 'exclusive', scope: 'workflow', workspaceId: 'ws', scopeWorkflowId: 'run' },
        { key: 'pkg:b', mode: 'exclusive', scope: 'workflow', workspaceId: 'ws', scopeWorkflowId: 'run' },
      ],
    });

    const locked = query.mock.calls.map((call) => call[1][0]);
    expect(locked).toEqual(['pkg:a', 'pkg:b']);
  });
});

describe('release', () => {
  it('needs something to name', async () => {
    const { instance } = service();
    await expect(instance.release({})).rejects.toThrow(/claimIds/);
  });

  it('only ever touches live rows, so releasing twice costs nothing', async () => {
    const { instance, update } = service();
    await expect(instance.release({ scopeWorkflowId: 'run-1' })).resolves.toBe(2);
    expect(update.mock.calls[0][0]).toMatchObject({ scopeWorkflowId: 'run-1' });
    expect(update.mock.calls[0][0].releasedAt).toBeDefined();
  });
});

describe('heldByPrefix', () => {
  it('asks for a family of keys by prefix, because they are invented on demand', async () => {
    // A package key is named after a package; nobody can enumerate them in advance, so `availability` cannot
    // be asked for them.
    const where = vi.fn();
    const andWhere = vi.fn();
    const getMany = vi.fn().mockResolvedValue([]);
    const qb: Record<string, unknown> = {};
    Object.assign(qb, {
      where: (...args: unknown[]) => (where(...args), qb),
      andWhere: (...args: unknown[]) => (andWhere(...args), qb),
      getMany,
    });
    const instance = new ResourceClaimService(
      { createQueryBuilder: () => qb } as never,
      { transaction: vi.fn() } as never,
      {},
    );

    await instance.heldByPrefix(['area:', 'pkg:']);

    const [clause, params] = andWhere.mock.calls[andWhere.mock.calls.length - 1];
    expect(clause).toContain('LIKE :prefix0');
    expect(clause).toContain('LIKE :prefix1');
    expect(params).toEqual({ prefix0: 'area:%', prefix1: 'pkg:%' });
  });

  it('asks nothing when there are no prefixes', async () => {
    const { instance } = service();
    await expect(instance.heldByPrefix([])).resolves.toEqual([]);
  });
});

describe('availability', () => {
  it('reports every key asked for, including ones nobody holds', async () => {
    const { instance } = service([{ key: 'engineer:runs', capacity: 6 }]);
    const states = await instance.availability(['engineer:runs', 'area:core']);
    expect(states).toEqual([
      { key: 'engineer:runs', capacity: 6, holders: [], free: 6 },
      { key: 'area:core', capacity: 1, holders: [], free: 1 },
    ]);
  });
});
