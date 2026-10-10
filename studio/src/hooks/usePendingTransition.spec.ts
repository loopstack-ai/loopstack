import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PENDING_TRANSITION_TIMEOUT_MS, usePendingTransition } from './usePendingTransition.ts';

describe('usePendingTransition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays pending while the server still offers the submitted transition', () => {
    const { result, rerender } = renderHook(({ available }) => usePendingTransition(available), {
      initialProps: { available: ['userAnswered'] },
    });

    expect(result.current.isPending).toBe(false);
    act(() => result.current.markSubmitted('userAnswered'));

    // The run mutation has long since resolved here — only the workflow state ends the wait.
    expect(result.current.isPending).toBe(true);
    rerender({ available: ['userAnswered'] });
    expect(result.current.isPending).toBe(true);
  });

  it('stops pending once the transition is no longer available', () => {
    const { result, rerender } = renderHook(({ available }) => usePendingTransition(available), {
      initialProps: { available: ['userAnswered'] },
    });

    act(() => result.current.markSubmitted('userAnswered'));
    rerender({ available: [] });

    expect(result.current.isPending).toBe(false);
  });

  it('does not re-arm when a run loops back to the same prompt', () => {
    const { result, rerender } = renderHook(({ available }) => usePendingTransition(available), {
      initialProps: { available: ['userAnswered'] },
    });

    act(() => result.current.markSubmitted('userAnswered'));
    rerender({ available: [] });
    // The next chat turn parks on the same waiting transition again.
    rerender({ available: ['userAnswered'] });

    expect(result.current.isPending).toBe(false);
  });

  it('gives up after the timeout so a lost event cannot wedge the widget', () => {
    const { result } = renderHook(() => usePendingTransition(['userAnswered']));

    act(() => result.current.markSubmitted('userAnswered'));
    expect(result.current.isPending).toBe(true);

    act(() => vi.advanceTimersByTime(PENDING_TRANSITION_TIMEOUT_MS));

    expect(result.current.isPending).toBe(false);
  });

  it('cancel drops the pending state for a submission that never reached the server', () => {
    const { result } = renderHook(() => usePendingTransition(['userAnswered']));

    act(() => result.current.markSubmitted('userAnswered'));
    act(() => result.current.cancel());

    expect(result.current.isPending).toBe(false);
  });
});
