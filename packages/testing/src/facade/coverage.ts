import type { Type } from '@nestjs/common';
import { getBlockName, getTransitionMetadata } from '@loopstack/common';
import { executedTransitions } from '@loopstack/contracts/types';
import type { RunTraceEvent } from '@loopstack/contracts/types';

/** A run trace source — a `TestRun`, or anything carrying a trace (e.g. a child record's state). */
export interface TraceSource {
  trace: RunTraceEvent[];
}

/**
 * State-machine coverage of one workflow across a set of runs.
 *
 * @public
 */
export interface WorkflowCoverage {
  workflow: string;
  /** Every transition the workflow declares. */
  declaredTransitions: string[];
  /** Transitions some run actually executed (successes and failures alike). */
  executedTransitions: string[];
  /** Declared transitions no run executed — untested paths. */
  missingTransitions: string[];
  /** Wait transitions the workflow declares. */
  declaredParks: string[];
  /** Wait transitions some run actually parked on (`run.settled` with the transition available). */
  parkedOn: string[];
  /** Declared wait transitions no run ever parked on — unasserted waiting states. */
  missingParks: string[];
  /** True when every declared transition executed and every declared park was reached. */
  complete: boolean;
}

/**
 * Answers "did these runs exercise every transition and every park of this workflow?" as a
 * query over their traces. Pass the `TestRun`s of the workflow under test (coverage is
 * per-class — runs of other workflows dilute nothing but contribute nothing).
 *
 * ```ts
 * const cov = coverage([happyPath, rejection, timeout], TriageTicketWorkflow);
 * expect(cov.missingTransitions).toEqual([]);
 * expect(cov.missingParks).toEqual([]);
 * ```
 *
 * @public
 */
export function coverage(runs: TraceSource[], workflowClass: Type): WorkflowCoverage {
  const metadata = getTransitionMetadata(workflowClass);
  const declaredTransitions = metadata.map((t) => t.methodName);
  const declaredParks = metadata.filter((t) => t.wait).map((t) => t.methodName);

  const executed = new Set<string>();
  const parked = new Set<string>();
  for (const run of runs) {
    for (const event of executedTransitions(run.trace)) {
      executed.add(event.transitionId);
    }
    for (const event of run.trace) {
      if (event.type === 'run.settled' && event.status === 'waiting') {
        for (const id of event.availableTransitions ?? []) parked.add(id);
      }
    }
  }

  const missingTransitions = declaredTransitions.filter((id) => !executed.has(id));
  const missingParks = declaredParks.filter((id) => !parked.has(id));

  return {
    workflow: getBlockName(workflowClass),
    declaredTransitions,
    executedTransitions: declaredTransitions.filter((id) => executed.has(id)),
    missingTransitions,
    declaredParks,
    parkedOn: declaredParks.filter((id) => parked.has(id)),
    missingParks,
    complete: missingTransitions.length === 0 && missingParks.length === 0,
  };
}
