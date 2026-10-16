import { describe, expect, it } from 'vitest';
import { runWorkflow } from '@loopstack/testing';
import { FlakyServiceTool } from '../../../tools/flaky-service.tool';
import { ErrorRouteExampleWorkflow } from '../error-route-example.workflow';

describe('ErrorRouteExampleWorkflow', () => {
  it('releases the resource on its own and ends the run as failed', async () => {
    const run = await runWorkflow(ErrorRouteExampleWorkflow, undefined, { providers: [FlakyServiceTool] });

    // The clean-up transition is automatic, so nobody had to trigger it.
    expect(run.path).toEqual(['takeResource', 'work', 'release']);
    expect(run.status).toBe('failed');
    expect(run.error).toContain('Simulated external service error');
    // `fail()` keeps what the clean-up did; a throw would have rolled its message back.
    expect(run.documents.map((document) => document.content)).toEqual([
      { role: 'assistant', text: 'Took the resource this run holds.' },
      { role: 'assistant', text: 'Gave the resource back.' },
    ]);
    // The happy path never ran.
    expect(run.trace).not.toContainEqual(
      expect.objectContaining({ type: 'transition.started', transitionId: 'finish' }),
    );
  });
});
