import { describe, expect, it } from 'vitest';
import { runWorkflow } from '@loopstack/testing';
import { FlakyServiceTool } from '../../../tools/flaky-service.tool';
import { AutoRetryExampleWorkflow } from '../auto-retry-example.workflow';

/**
 * The in-process harness stops at the first auto-retry: the retry itself is scheduled by the
 * queue. This spec asserts the failure is turned into a pending retry; the smoke run
 * (`sandbox/smoke-tests`) runs the retries on the real queue and checks the run completes.
 */
describe('AutoRetryExampleWorkflow', () => {
  it('schedules an automatic retry when the service call fails', async () => {
    const run = await runWorkflow(AutoRetryExampleWorkflow, undefined, { providers: [FlakyServiceTool] });

    expect(run.status).toBe('waiting');
    expect(run.place).toBe('start');
    expect(run.error).toBe('Simulated external service error');
    expect(run.trace).toContainEqual(
      expect.objectContaining({ type: 'transition.failed', transitionId: 'callService', willRetry: true }),
    );
  });
});
