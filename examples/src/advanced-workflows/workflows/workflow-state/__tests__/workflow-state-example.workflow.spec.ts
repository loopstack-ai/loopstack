import { describe, expect, it } from 'vitest';
import { runWorkflow } from '@loopstack/testing';
import { WorkflowStateWorkflow } from '../workflow-state-example.workflow';

describe('WorkflowStateWorkflow', () => {
  it('reads the state written in the first transition from the second', async () => {
    const run = await runWorkflow(WorkflowStateWorkflow);

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['createSomeData', 'showResults']);

    const texts = run.documents.map((d) => (d.content as { text?: string }).text);
    expect(texts).toEqual(['Data from state: Hello :)', 'Use workflow helper method: HELLO :)']);

    // State is private to the workflow — writing it publishes nothing.
    expect(run.result).toBeNull();
  });
});
