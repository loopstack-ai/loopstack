import { describe, expect, it } from 'vitest';
import { TestClock, runWorkflow } from '@loopstack/testing';
import { SlowOperationTool } from '../../../tools/slow-operation.tool';
import { TransitionTimeoutExampleWorkflow } from '../transition-timeout-example.workflow';

describe('TransitionTimeoutExampleWorkflow', () => {
  it('fails the transition once it runs past its 2-second timeout', async () => {
    const clock = new TestClock();
    const pending = runWorkflow(TransitionTimeoutExampleWorkflow, undefined, {
      providers: [SlowOperationTool],
      clock,
    });

    await clock.waitForScheduled(); // the transition armed its 2s timeout
    clock.advance(2000);
    const run = await pending;

    expect(run.status).toBe('failed');
    expect(run.error).toBe("Transition 'runSlowOperation' timed out after 2000ms");
    expect(run.place).toBe('start');
    expect(run.trace).toContainEqual(expect.objectContaining({ type: 'tool.failed', toolName: 'slow_operation' }));
  });
});
