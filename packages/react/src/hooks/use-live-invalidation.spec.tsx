import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_ENV_KEY, createTestClient, createWrapper } from '../testing/test-utils.js';
import { useLiveInvalidation } from './use-live-invalidation.js';

const workflowUpdated = (id: string, parentId?: string) => ({
  type: 'workflow.updated',
  userId: 'u1',
  workerId: 'w1',
  id,
  workflowId: id,
  status: 'running',
  ...(parentId ? { parentId } : {}),
});

describe('useLiveInvalidation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces bursts into one invalidation per key', () => {
    const { client, stream } = createTestClient();
    const { wrapper, queryClient } = createWrapper(client);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useLiveInvalidation(), { wrapper });
    stream.emit(workflowUpdated('wf-1'));
    stream.emit(workflowUpdated('wf-1'));
    stream.emit(workflowUpdated('wf-1'));

    expect(invalidate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);

    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['workflow', TEST_ENV_KEY, 'wf-1'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['workflowStatus', TEST_ENV_KEY, 'wf-1'] });
  });

  it('resets the debounce window on every event (trailing edge)', () => {
    const { client, stream } = createTestClient();
    const { wrapper, queryClient } = createWrapper(client);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useLiveInvalidation(), { wrapper });
    stream.emit(workflowUpdated('wf-1'));
    vi.advanceTimersByTime(200);
    stream.emit(workflowUpdated('wf-1'));
    vi.advanceTimersByTime(200);

    expect(invalidate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(invalidate).toHaveBeenCalledTimes(2);
  });

  it('debounces distinct keys independently', () => {
    const { client, stream } = createTestClient();
    const { wrapper, queryClient } = createWrapper(client);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useLiveInvalidation(), { wrapper });
    stream.emit(workflowUpdated('wf-1'));
    stream.emit(workflowUpdated('wf-2'));
    vi.advanceTimersByTime(300);

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['workflow', TEST_ENV_KEY, 'wf-1'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['workflow', TEST_ENV_KEY, 'wf-2'] });
  });

  it('stream.reset invalidates only this environment, immediately', () => {
    const { client, stream } = createTestClient();
    const { wrapper, queryClient } = createWrapper(client);
    queryClient.setQueryData(['workflow', TEST_ENV_KEY, 'wf-1'], { id: 'wf-1' });
    queryClient.setQueryData(['workflow', 'other-env', 'wf-2'], { id: 'wf-2' });

    renderHook(() => useLiveInvalidation(), { wrapper });
    stream.emit({ type: 'stream.reset', userId: null, workerId: 'w1' });

    expect(queryClient.getQueryState(['workflow', TEST_ENV_KEY, 'wf-1'])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(['workflow', 'other-env', 'wf-2'])?.isInvalidated).toBe(false);
  });

  it('ignores unknown message types', () => {
    const { client, stream } = createTestClient();
    const { wrapper, queryClient } = createWrapper(client);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useLiveInvalidation(), { wrapper });
    stream.emit({ type: 'future.event', raw: { anything: true } });
    vi.advanceTimersByTime(300);

    expect(invalidate).not.toHaveBeenCalled();
  });

  it('cancels pending invalidations on unmount', () => {
    const { client, stream } = createTestClient();
    const { wrapper, queryClient } = createWrapper(client);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { unmount } = renderHook(() => useLiveInvalidation(), { wrapper });
    stream.emit(workflowUpdated('wf-1'));
    unmount();
    vi.advanceTimersByTime(300);

    expect(invalidate).not.toHaveBeenCalled();
    expect(stream.handlerCount()).toBe(0);
  });
});
