import { TestingModule } from '@nestjs/testing';
import { WorkflowProcessorService } from '@loopstack/core';
import { createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { WorkflowStateWorkflow } from '../workflow-state.workflow';

describe('WorkflowStateWorkflow', () => {
  let module: TestingModule;
  let workflow: WorkflowStateWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    module = await createWorkflowTest().forWorkflow(WorkflowStateWorkflow).compile();

    workflow = module.get(WorkflowStateWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(workflow).toBeDefined();
  });

  it('should execute workflow and pass state between transitions', async () => {
    const context = createStatelessContext();

    const result = await processor.process(workflow, {}, context);

    expect(result.hasError).toBe(false);

    // Verify MessageDocuments were created with state from previous transition
    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          className: 'MessageDocument',
          content: expect.objectContaining({
            role: 'assistant',
            content: 'Data from state: Hello :)',
          }),
        }),
        expect.objectContaining({
          className: 'MessageDocument',
          content: expect.objectContaining({
            role: 'assistant',
            content: 'Use workflow helper method: HELLO :)',
          }),
        }),
      ]),
    );
  });
});
