import type { Clock } from '@loopstack/common';

interface Scheduled {
  dueAt: number;
  fn: () => void;
  canceled: boolean;
}

/**
 * A deterministic `Clock` for tests: `now()` is a settable value, and scheduled callbacks are
 * **held** until `advance(ms)` moves time past their due point — nothing fires on its own.
 * Pass it to `runWorkflow` via the `clock` option to get reproducible trace timestamps and
 * testable transition timeouts.
 *
 * ```ts
 * const clock = new TestClock();
 * const pending = runWorkflow(SlowWorkflow, args, { clock });
 * await clock.waitForScheduled(); // the transition armed its timeout timer
 * clock.advance(60_000);          // fire it
 * const run = await pending;
 * expect(run.status).toBe('failed');
 * ```
 *
 * @public
 */
export class TestClock implements Clock {
  private scheduled: Scheduled[] = [];
  private waiters: Array<{ count: number; resolve: () => void }> = [];

  constructor(private current = 0) {}

  now(): number {
    return this.current;
  }

  schedule(fn: () => void, ms: number): () => void {
    const entry: Scheduled = { dueAt: this.current + ms, fn, canceled: false };
    this.scheduled.push(entry);
    this.notifyWaiters();
    return () => {
      entry.canceled = true;
    };
  }

  /** Set the current time (must not go backwards). Fires callbacks that become due. */
  set(time: number): void {
    if (time < this.current) throw new Error(`TestClock cannot go backwards (${time} < ${this.current}).`);
    this.current = time;
    this.firePending();
  }

  /** Move time forward and fire every callback that becomes due, in due-order. */
  advance(ms: number): void {
    this.set(this.current + ms);
  }

  /** Resolves once at least `count` uncanceled callbacks are pending — the synchronization
   * point for timeout tests: advance only after the code under test armed its timer. */
  waitForScheduled(count = 1): Promise<void> {
    if (this.pendingCount() >= count) return Promise.resolve();
    return new Promise((resolve) => this.waiters.push({ count, resolve }));
  }

  private pendingCount(): number {
    return this.scheduled.filter((s) => !s.canceled).length;
  }

  private notifyWaiters(): void {
    const pending = this.pendingCount();
    this.waiters = this.waiters.filter((waiter) => {
      if (pending >= waiter.count) {
        waiter.resolve();
        return false;
      }
      return true;
    });
  }

  private firePending(): void {
    const due = this.scheduled.filter((s) => !s.canceled && s.dueAt <= this.current).sort((a, b) => a.dueAt - b.dueAt);
    this.scheduled = this.scheduled.filter((s) => !due.includes(s));
    for (const entry of due) {
      if (!entry.canceled) entry.fn();
    }
  }
}
