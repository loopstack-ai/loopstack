import { describe, expect, it } from 'vitest';
import { runWorkflow } from '@loopstack/testing';
import { FlakyServiceTool } from '../../../tools/flaky-service.tool';
import { RetryTargetExampleWorkflow } from '../retry-target-example.workflow';

/**
 * The in-process harness stops at the first auto-retry: the retry itself is scheduled by the
 * queue. This spec asserts the retry is routed through the retry target; the smoke run
 * (`sandbox/smoke-tests`) runs the retries on the real queue and checks the run completes.
 */
describe('RetryTargetExampleWorkflow', () => {
  it('moves the workflow to the retry target when the service call fails', async () => {
    const run = await runWorkflow(RetryTargetExampleWorkflow, undefined, { providers: [FlakyServiceTool] });

    expect(run.status).toBe('waiting');
    expect(run.place).toBe('refresh_credentials');
    expect(run.path).toEqual(['setup', 'callService']);
    expect(run.trace).toContainEqual(
      expect.objectContaining({ type: 'transition.failed', transitionId: 'callService', willRetry: true }),
    );
  });
});
