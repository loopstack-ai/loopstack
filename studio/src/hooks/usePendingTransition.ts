import { useCallback, useEffect, useState } from 'react';

/**
 * How long a submitted transition may stay pending before the widget re-enables itself.
 * Long enough to cover a busy queue, short enough that a dropped event is recoverable
 * without a page reload.
 */
export const PENDING_TRANSITION_TIMEOUT_MS = 10_000;

export interface PendingTransition {
  /** True from the click until the refreshed server state no longer offers the transition. */
  isPending: boolean;
  /** Record a transition as submitted. Call it right before firing the run mutation. */
  markSubmitted: (transitionId: string) => void;
  /** Drop the pending state — the submission never reached the server. */
  cancel: () => void;
}

/**
 * Holds a widget's pending state from the click until the transition has actually been applied.
 *
 * `processor.run` only enqueues the transition on BullMQ, so the run mutation settles well before
 * the workflow has moved: a spinner driven by `isPending` switches off while nothing on screen has
 * changed yet, and the user sees their click do nothing. The honest signal is the server state
 * itself — the submitted transition disappears from `availableTransitions` once it is applied — so
 * that is what ends the wait here, bounded by {@link PENDING_TRANSITION_TIMEOUT_MS} so a lost event
 * cannot leave a widget stuck.
 */
export function usePendingTransition(
  availableTransitions: string[],
  timeoutMs: number = PENDING_TRANSITION_TIMEOUT_MS,
): PendingTransition {
  const [submitted, setSubmitted] = useState<string | null>(null);
  const isPending = submitted !== null && availableTransitions.includes(submitted);

  // Forget the transition the moment it is applied. Without this a workflow that loops back to the
  // same prompt (a chat turn answering into the same waiting place) would re-arm the spinner.
  useEffect(() => {
    if (submitted !== null && !isPending) setSubmitted(null);
  }, [submitted, isPending]);

  useEffect(() => {
    if (submitted === null) return;
    const timer = setTimeout(() => setSubmitted(null), timeoutMs);
    return () => clearTimeout(timer);
  }, [submitted, timeoutMs]);

  return {
    isPending,
    markSubmitted: useCallback((transitionId: string) => setSubmitted(transitionId), []),
    cancel: useCallback(() => setSubmitted(null), []),
  };
}
