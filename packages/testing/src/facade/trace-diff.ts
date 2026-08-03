import type { RunTraceEvent } from '@loopstack/contracts/types';

/**
 * The first point where two traces disagree — the divergence's position, both events (absent
 * when one trace ended early), and what differed.
 *
 * @public
 */
export interface TraceDivergence {
  index: number;
  expected?: RunTraceEvent;
  actual?: RunTraceEvent;
  reason: string;
}

/**
 * The comparable identity of an event — what the run *did*, stripped of when and how long it
 * took. Volatile fields (`seq`, `ts`, durations, envelopes, diffs, generated ids) are excluded
 * so two runs of the same behavior compare equal.
 */
function identity(event: RunTraceEvent): Record<string, unknown> {
  switch (event.type) {
    case 'transition.started':
      return { type: event.type, transitionId: event.transitionId, from: event.from, to: event.to };
    case 'transition.completed':
      return { type: event.type, transitionId: event.transitionId };
    case 'transition.failed':
      return { type: event.type, transitionId: event.transitionId, willRetry: event.willRetry };
    case 'tool.called':
    case 'tool.completed':
    case 'tool.failed':
      return { type: event.type, toolName: event.toolName, toolSeq: event.toolSeq, transitionId: event.transitionId };
    case 'document.emitted':
      // `key` is excluded — keys are frequently generated per run (uuids, child-id-derived).
      return { type: event.type, documentName: event.documentName, transitionId: event.transitionId };
    case 'child.queued':
      return { type: event.type, workflowName: event.workflowName, transitionId: event.transitionId };
    case 'child.settled':
      return { type: event.type, status: event.status };
    case 'run.settled':
      return { type: event.type, status: event.status, place: event.place };
  }
}

function firstDifference(expected: Record<string, unknown>, actual: Record<string, unknown>): string | undefined {
  for (const key of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
    if (JSON.stringify(expected[key]) !== JSON.stringify(actual[key])) {
      return `${key}: expected ${JSON.stringify(expected[key])}, actual ${JSON.stringify(actual[key])}`;
    }
  }
  return undefined;
}

/**
 * Compares two run traces by behavioral identity and reports the **first divergence** — the
 * exact point where the runs stopped doing the same thing — or `null` when they match.
 * Timing, sequence numbers, envelopes, and state diffs are ignored: two runs of identical
 * behavior diff clean even though no two executions share timestamps.
 *
 * ```ts
 * const divergence = diffTraces(recordedRun.trace, currentRun.trace);
 * expect(divergence).toBeNull();
 * ```
 *
 * @public
 */
export function diffTraces(expected: RunTraceEvent[], actual: RunTraceEvent[]): TraceDivergence | null {
  const length = Math.max(expected.length, actual.length);
  for (let index = 0; index < length; index++) {
    const expectedEvent = expected[index];
    const actualEvent = actual[index];
    if (!expectedEvent) {
      return {
        index,
        actual: actualEvent,
        reason: `actual trace has ${actual.length - expected.length} extra event(s)`,
      };
    }
    if (!actualEvent) {
      return {
        index,
        expected: expectedEvent,
        reason: `actual trace ended early — ${expected.length - actual.length} expected event(s) missing`,
      };
    }
    const difference = firstDifference(identity(expectedEvent), identity(actualEvent));
    if (difference) {
      return { index, expected: expectedEvent, actual: actualEvent, reason: difference };
    }
  }
  return null;
}
