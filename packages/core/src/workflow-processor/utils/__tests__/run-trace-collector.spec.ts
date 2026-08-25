import { describe, expect, it } from 'vitest';
import type { RunTraceEvent } from '@loopstack/contracts/types';
import { RunTraceCollector, shallowStateDiff } from '../run-trace-collector.js';

describe('RunTraceCollector', () => {
  it('assigns monotonic seq and timestamps', () => {
    const collector = new RunTraceCollector();
    collector.emit({ type: 'transition.started', transitionId: 'a', from: 'start', to: 'b' });
    collector.emit({ type: 'run.settled', status: 'waiting', place: 'b' });

    expect(collector.events.map((e) => e.seq)).toEqual([0, 1]);
    expect(collector.events.every((e) => typeof e.ts === 'number')).toBe(true);
  });

  it('continues seq when seeded from a resume carrier', () => {
    const seed: RunTraceEvent[] = [
      { type: 'transition.started', transitionId: 'a', from: 'start', to: 'b', seq: 0, ts: 1 },
      { type: 'run.settled', status: 'waiting', place: 'b', seq: 1, ts: 2 },
    ];
    const collector = new RunTraceCollector(seed);
    collector.emit({ type: 'transition.started', transitionId: 'c', from: 'b', to: 'end' });

    expect(collector.events).toHaveLength(3);
    expect(collector.events[2].seq).toBe(2);
  });

  it('continues the sequence from a persisted watermark without rewinding', () => {
    const collector = new RunTraceCollector();
    collector.continueFrom(5);
    collector.emit({ type: 'run.settled', status: 'waiting', place: 'b' });
    expect(collector.events[0].seq).toBe(5);

    // Never rewinds below the in-memory continuity.
    collector.continueFrom(2);
    collector.emit({ type: 'run.settled', status: 'completed', place: 'end' });
    expect(collector.events[1].seq).toBe(6);
  });

  it('tracks per-transition tool seq', () => {
    const collector = new RunTraceCollector();
    expect(collector.nextToolSeq('t1')).toBe(0);
    expect(collector.nextToolSeq('t1')).toBe(1);
    expect(collector.nextToolSeq('t2')).toBe(0);
    expect(collector.nextToolSeq(undefined)).toBe(0);
  });

  it('counts transition attempts since an index', () => {
    const collector = new RunTraceCollector();
    collector.emit({ type: 'transition.started', transitionId: 'a', from: 'start', to: 'b' });
    collector.emit({ type: 'run.settled', status: 'waiting', place: 'b' });

    expect(collector.startedSince(0)).toBe(1);
    expect(collector.startedSince(1)).toBe(0);
  });
});

describe('shallowStateDiff', () => {
  it('reports changed, added, and removed keys and skips untouched references', () => {
    const shared = { deep: true };
    const before = { unchanged: shared, changed: 1, removed: 'x' };
    const after = { unchanged: shared, changed: 2, added: 'y' };

    expect(shallowStateDiff(before, after)).toEqual({
      changed: { before: 1, after: 2 },
      removed: { before: 'x' },
      added: { after: 'y' },
    });
  });

  it('returns an empty diff for identical state', () => {
    const state = { a: 1 };
    expect(shallowStateDiff(state, state)).toEqual({});
  });
});
