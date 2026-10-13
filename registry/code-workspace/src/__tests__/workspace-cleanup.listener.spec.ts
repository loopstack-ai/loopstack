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
});
