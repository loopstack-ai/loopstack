/**
 * Thrown by framework I/O (document writes, tool calls, sub-workflow queueing) when the owning
 * execution scope has been aborted — most commonly because the transition exceeded its timeout.
 *
 * A timed-out transition method cannot be preempted (`Promise.race` abandons but does not stop the
 * loser). This error is how the abandoned "zombie" is stopped cooperatively: its next framework
 * call throws instead of writing outside the rolled-back transaction.
 */
export class TransitionAbortedError extends Error {
  constructor(message = 'Execution was aborted (the transition timed out or was canceled).') {
    super(message);
    this.name = 'TransitionAbortedError';
  }
}
