import { TestingModule } from '@nestjs/testing';
import { WorkflowProcessorService } from '@loopstack/core';
import { createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { WorkflowToolResultsWorkflow } from '../workflow-tool-results.workflow';

describe('WorkflowToolResultsWorkflow', () => {
  let module: TestingModule;
  let workflow: WorkflowToolResultsWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    module = await createWorkflowTest().forWorkflow(WorkflowToolResultsWorkflow).compile();

    workflow = module.get(WorkflowToolResultsWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(workflow).toBeDefined();
  });

  describe('state persistence across transitions', () => {
    it('should store data in the initial transition', async () => {
      const context = createStatelessContext();

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);
      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            className: 'MessageDocument',
            content: expect.objectContaining({
              role: 'assistant',
              content: 'Stored in initial transition: Hello World.',
            }),
          }),
        ]),
      );
    });

    it('should access stored data from a previous transition', async () => {
      const context = createStatelessContext();

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);
      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            className: 'MessageDocument',
            content: expect.objectContaining({
              role: 'assistant',
              content: 'Accessed from previous transition: Hello World.',
            }),
          }),
        ]),
      );
    });

    it('should access stored data via a helper method', async () => {
      const context = createStatelessContext();

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);
      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            className: 'MessageDocument',
            content: expect.objectContaining({
              role: 'assistant',
              content: 'Accessed via helper method: Hello World.',
            }),
          }),
        ]),
      );
    });
  });
});
