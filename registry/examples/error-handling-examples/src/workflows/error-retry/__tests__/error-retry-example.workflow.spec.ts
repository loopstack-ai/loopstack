import { describe, expect, it } from 'vitest';
import { replay, runWorkflow } from '@loopstack/testing';
import { ErrorRetryWorkflow } from '../error-retry-example.workflow';
import { ErrorRetryFailingChildWorkflow } from '../failing-child.workflow';
import { SlowTool } from '../tools/slow.tool';
import { Step1Tool } from '../tools/step1.tool';
import { Step2Tool } from '../tools/step2.tool';

/**
 * The concept under test: what a transition failure *does to the run*. Two shapes, chosen by the
 * transition itself:
 *
 *  - no `errorPlace` — the run stops on the place it came from and the failed transition stays
 *    offered, so a human can hit Retry;
 *  - `errorPlace: 'x'` — the run is routed to `x`, where a recovery transition takes over.
 *
 * Which step fails is scripted by replaying the `step2` tool envelopes, so the failure boundary is
 * explicit and the workflow's own code runs for real. The modes that count attempts server-side
 * (auto-retry, hybrid, `retryTarget`) are driven by the queue's backoff scheduler and are verified
 * by running the workflow in Studio, not here.
 *
 * Acceptance criteria:
 *   C1 — a failing transition with no errorPlace keeps the run on its originating place, error surfaced.
 *   C2 — a failing transition with an errorPlace routes there and offers its recovery transition.
 */
const PROVIDERS = [Step1Tool, Step2Tool, SlowTool, ErrorRetryFailingChildWorkflow];
const OK = { data: 'Step completed successfully.' };
const BOOM = { error: 'Simulated external service error' };

/** Scripts the `step2` tool call-by-call: `true` succeeds, `false` fails. */
const step2Calls = (...outcomes: boolean[]) =>
  replay({
    version: 3,
    recordings: outcomes.map((ok) => ({ tool: 'step2', envelope: ok ? OK : BOOM })),
  });

describe('ErrorRetryWorkflow', () => {
  it('C1: keeps the run on its place for manual retry when no errorPlace is declared', async () => {
    // Second step2 call is `manualRetryStep` — it declares neither retryAttempts nor errorPlace.
    const run = await runWorkflow(ErrorRetryWorkflow, undefined, {
      providers: PROVIDERS,
      replay: step2Calls(true, false),
    });

    expect(run.path).toEqual(['setup', 'autoRetryStep', 'step2Instructions', 'manualRetryStep']);
    expect(run.status).toBe('failed');
    expect(run.place).toBe('step2_ready');
    expect(run.error).toBe('Simulated external service error');
  });

  it('C2: routes to the declared errorPlace and offers the recovery transition there', async () => {
    // Third step2 call is `customErrorStep` — it declares errorPlace: 'error_custom'.
    const run = await runWorkflow(ErrorRetryWorkflow, undefined, {
      providers: PROVIDERS,
      replay: step2Calls(true, true, false),
    });

    expect(run.status).toBe('failed');
    expect(run.place).toBe('error_custom');
    // What the human sees at the error place — the same view the CLI and Studio resolve.
    expect(run.parkView()).toMatchObject({
      widget: 'button',
      options: { transition: 'handleCustomError', label: 'Recover' },
      transitions: ['handleCustomError'],
    });
  });
});
