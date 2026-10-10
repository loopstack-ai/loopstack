import { describe, expect, it } from 'vitest';
import { runWorkflow } from '@loopstack/testing';
import { WorkflowResultWorkflow } from '../workflow-result-example.workflow';

describe('WorkflowResultWorkflow', () => {
  it('publishes the result built across both transitions, and nothing from state', async () => {
    const run = await runWorkflow(WorkflowResultWorkflow);

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['greet', 'shout']);

    // Both assignResult() calls merged; the `name` kept in state is not part of the result.
    expect(run.result).toEqual({ greeting: 'Hello World.', shout: 'HELLO WORLD!' });
  });
});
