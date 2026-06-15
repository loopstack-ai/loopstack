import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getBlockConfig } from '@loopstack/common';
import { WorkflowProcessorService } from '@loopstack/core';
import { createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { RunSubWorkflowExampleFailingSubWorkflow } from '../run-sub-workflow-example-failing-sub.workflow';

describe('RunSubWorkflowExampleFailingSubWorkflow', () => {
  let module: TestingModule;
  let workflow: RunSubWorkflowExampleFailingSubWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    module = await createWorkflowTest().forWorkflow(RunSubWorkflowExampleFailingSubWorkflow).compile();

    workflow = module.get(RunSubWorkflowExampleFailingSubWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    if (module) await module.close();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(workflow).toBeDefined();
    });

    it('should have config defined', () => {
      expect(getBlockConfig(workflow)).toBeDefined();
    });
  });

  it('records the pre-throw message before failing', async () => {
    const result = await processor.process(workflow, {}, createStatelessContext());

    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentName: 'message',
          content: expect.objectContaining({
            role: 'assistant',
            text: 'About to throw — this child always fails on purpose.',
          }),
        }),
      ]),
    );
  });

  it('throws from the fail transition and surfaces the error on the workflow', async () => {
    const result = await processor.process(workflow, {}, createStatelessContext());

    expect(result.hasError).toBe(true);
    expect(result.errorMessage).toBe('Demo failure: this sub-workflow is wired to always throw.');
  });
});
