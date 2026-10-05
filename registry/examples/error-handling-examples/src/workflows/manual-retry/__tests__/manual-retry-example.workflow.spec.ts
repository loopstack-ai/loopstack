import { describe, expect, it } from 'vitest';
import { runWorkflow } from '@loopstack/testing';
import { FlakyServiceTool } from '../../../tools/flaky-service.tool';
import { ManualRetryExampleWorkflow } from '../manual-retry-example.workflow';

describe('ManualRetryExampleWorkflow', () => {
  it('stays at its place with the failed transition offered for a manual retry', async () => {
    const run = await runWorkflow(ManualRetryExampleWorkflow, undefined, { providers: [FlakyServiceTool] });

    expect(run.status).toBe('failed');
    expect(run.error).toBe('Simulated external service error');
    expect(run.place).toBe('start');
    expect(run.trace).toContainEqual(
      expect.objectContaining({ type: 'transition.failed', transitionId: 'callService', willRetry: false }),
    );
    expect(run.raw.availableTransitions.map((t) => t.id)).toEqual(['callService']);
  });
});
