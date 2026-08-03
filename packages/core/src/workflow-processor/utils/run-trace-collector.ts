import type { RunTraceEvent, RunTraceEventInput, StateDiff } from '@loopstack/contracts/types';

/**
 * Collects the run trace of one `process()` call. Emission is a synchronous array push —
 * no I/O on the hot path. For stateless resumes the collector is seeded with the carrier's
 * accumulated trace so `seq` continues monotonically across park/resume cycles.
 */
export class RunTraceCollector {
  readonly events: RunTraceEvent[];
  private seq: number;
  private toolSeqByTransition = new Map<string, number>();

  constructor(seed?: RunTraceEvent[]) {
    this.events = seed ? [...seed] : [];
    this.seq = this.events.length > 0 ? this.events[this.events.length - 1].seq + 1 : 0;
  }

  /**
   * Continue the sequence at `nextSeq` (used by stateful runs to continue from the persisted
   * rows). Never rewinds — a seeded in-memory trace always keeps its own continuity.
   */
  continueFrom(nextSeq: number): void {
    this.seq = Math.max(this.seq, nextSeq);
  }

  emit(event: RunTraceEventInput): void {
    this.events.push({ ...event, seq: this.seq++, ts: Date.now() } as RunTraceEvent);
  }

  /** 0-based order of the next tool call within the given transition. */
  nextToolSeq(transitionId: string | undefined): number {
    const key = transitionId ?? '';
    const next = this.toolSeqByTransition.get(key) ?? 0;
    this.toolSeqByTransition.set(key, next + 1);
    return next;
  }

  /** Number of `transition.started` events at or after the given index — the progress probe. */
  startedSince(index: number): number {
    let count = 0;
    for (let i = index; i < this.events.length; i++) {
      if (this.events[i].type === 'transition.started') count++;
    }
    return count;
  }
}

/**
 * Shallow per-key diff of workflow state before vs. after a transition. Compares top-level
 * values by identity — `assignState`/`setState` replace the values of touched keys, so
 * untouched keys (shared references) drop out.
 */
export function shallowStateDiff(before: Record<string, unknown>, after: Record<string, unknown>): StateDiff {
  const diff: StateDiff = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (!Object.is(before[key], after[key])) {
      diff[key] = {
        ...(key in before ? { before: before[key] } : {}),
        ...(key in after ? { after: after[key] } : {}),
      };
    }
  }
  return diff;
}
