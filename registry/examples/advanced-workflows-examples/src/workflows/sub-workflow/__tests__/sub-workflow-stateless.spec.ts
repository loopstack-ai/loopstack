import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { executedTransitions } from '@loopstack/contracts/types';
import { WorkflowProcessorService } from '@loopstack/core';
import { createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { RunSubWorkflowExampleParentWorkflow } from '../sub-workflow-parent.workflow';
import { RunSubWorkflowExampleSubWorkflow } from '../sub-workflow-sub.workflow';

/**
 * Stateless in-process execution of a parent workflow with sub-workflows: children run inline,
 * their callbacks are applied automatically, and the whole composition completes in a single
 * `process()` call — no Redis, no Postgres.
 */
describe('RunSubWorkflowExampleParentWorkflow — stateless inline children', () => {
  let module: TestingModule;
  let workflow: RunSubWorkflowExampleParentWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(RunSubWorkflowExampleParentWorkflow)
      .withProvider(RunSubWorkflowExampleSubWorkflow)
      .compile();

    workflow = module.get(RunSubWorkflowExampleParentWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('runs both children inline and completes in a single call', async () => {
    const result = await processor.process(workflow, {}, createStatelessContext());

    expect(result.hasError).toBe(false);
    expect(result.status).toBe('completed');
    expect(result.place).toBe('end');
    expect(executedTransitions(result.trace).map((e) => e.transitionId)).toEqual([
      'runWorkflow',
      'subWorkflowCallback',
      'runWorkflow2',
      'subWorkflow2Callback',
    ]);

    // Parent documents carry the child results delivered via the callbacks
    const texts = result.documents.map((d) => (d.content as { text?: string }).text);
    expect(texts).toEqual(
      expect.arrayContaining(['A message from sub workflow 1: Hi mom!', 'A message from sub workflow 2: Hi mom!']),
    );

    // Both inline children are recorded with their own results and documents
    const children = result.statelessState?.children ?? [];
    expect(children).toHaveLength(2);
    for (const child of children) {
      expect(child.status).toBe('completed');
      expect(child.result).toEqual({ message: 'Hi mom!' });
      expect(child.documents.length).toBeGreaterThan(0);
    }

    // All callbacks were drained
    expect(result.statelessState?.callbacks).toBeUndefined();
  });
});

describe('RunSubWorkflowExampleParentWorkflow — runWorkflow facade', () => {
  it('completes the whole composition through the facade', async () => {
    const { runWorkflow } = await import('@loopstack/testing');

    const run = await runWorkflow(RunSubWorkflowExampleParentWorkflow, undefined, {
      providers: [RunSubWorkflowExampleSubWorkflow],
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['runWorkflow', 'subWorkflowCallback', 'runWorkflow2', 'subWorkflow2Callback']);
    expect(run.children).toHaveLength(2);
    expect(run.children.every((c) => c.status === 'completed')).toBe(true);
  });
});
