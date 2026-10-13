import { describe, expect, it, vi } from 'vitest';
import { WorkspaceCleanupListener } from '../workspace-cleanup.listener.js';

function listener(onRemove?: () => Promise<void>) {
  const removeWorkspaceState = vi.fn(onRemove ?? (() => Promise.resolve()));
  return {
    instance: new WorkspaceCleanupListener({ removeWorkspaceState } as never),
    removeWorkspaceState,
  };
}

describe('WorkspaceCleanupListener', () => {
  it('releases a deleted workspace’s whole state', async () => {
    const { instance, removeWorkspaceState } = listener();

    await instance.onWorkspaceDeleted({ id: 'ws-1' });

    expect(removeWorkspaceState).toHaveBeenCalledWith('ws-1');
  });

  it('never throws, because nothing is waiting to catch it', async () => {
    // `emit` does not await an async listener, so a rejection here would be unhandled and take the process
    // down over a directory. What it fails to remove is state whose row is gone — which is exactly what an
    // orphan sweep looks for.
    const { instance } = listener(() => Promise.reject(new Error('device or resource busy')));

    await expect(instance.onWorkspaceDeleted({ id: 'ws-1' })).resolves.toBeUndefined();
  });

  it('removes one workspace at a time, in arrival order, even when the events arrive in a burst', async () => {
    // A batch delete emits every event at once. Concurrent removals contend for Docker and the disk and
    // stall the process, so each one starts only after the one before it has settled — failures included.
    const order: string[] = [];
    const settle: Record<string, () => void> = {};
    const removeWorkspaceState = vi.fn(
      (id: string) =>
        new Promise<void>((resolve, reject) => {
          order.push(`start ${id}`);
          settle[id] = id === 'ws-2' ? () => reject(new Error('busy')) : resolve;
        }),
    );
    const instance = new WorkspaceCleanupListener({ removeWorkspaceState } as never);

    const first = instance.onWorkspaceDeleted({ id: 'ws-1' });
    const second = instance.onWorkspaceDeleted({ id: 'ws-2' });
    const third = instance.onWorkspaceDeleted({ id: 'ws-3' });
    await Promise.resolve();
    expect(order).toEqual(['start ws-1']);

    settle['ws-1']();
    await first;
    expect(order).toEqual(['start ws-1', 'start ws-2']);

    settle['ws-2']();
    await second;
    expect(order).toEqual(['start ws-1', 'start ws-2', 'start ws-3']);

    settle['ws-3']();
    await third;
    expect(removeWorkspaceState).toHaveBeenCalledTimes(3);
  });
});
