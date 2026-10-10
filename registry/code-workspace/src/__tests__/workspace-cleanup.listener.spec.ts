import { describe, expect, it, vi } from 'vitest';
import { WorkspaceCleanupListener } from '../workspace-cleanup.listener.js';

function listener(onRemove?: () => Promise<void>) {
  const removeWorkspaceState = vi.fn(onRemove ?? (() => Promise.resolve()));
  const removeWorkflowCheckout = vi.fn(onRemove ?? (() => Promise.resolve()));
  return {
    instance: new WorkspaceCleanupListener({ removeWorkspaceState, removeWorkflowCheckout } as never),
    removeWorkspaceState,
    removeWorkflowCheckout,
  };
}

describe('WorkspaceCleanupListener', () => {
  it('releases a deleted workspace’s whole state', async () => {
    const { instance, removeWorkspaceState } = listener();

    await instance.onWorkspaceDeleted({ id: 'ws-1' });

    expect(removeWorkspaceState).toHaveBeenCalledWith('ws-1');
  });

  it('releases a deleted run’s checkout, naming the workspace it lived in', async () => {
    const { instance, removeWorkflowCheckout } = listener();

    await instance.onWorkflowDeleted({ id: 'run-1', workspaceId: 'ws-1' });

    expect(removeWorkflowCheckout).toHaveBeenCalledWith('ws-1', 'run-1');
  });

  it('never throws, because nothing is waiting to catch it', async () => {
    // `emit` does not await an async listener, so a rejection here would be unhandled and take the process
    // down over a directory. What it fails to remove is state whose row is gone — which is exactly what an
    // orphan sweep looks for.
    const { instance } = listener(() => Promise.reject(new Error('device or resource busy')));

    await expect(instance.onWorkspaceDeleted({ id: 'ws-1' })).resolves.toBeUndefined();
    await expect(instance.onWorkflowDeleted({ id: 'run-1', workspaceId: 'ws-1' })).resolves.toBeUndefined();
  });
});
