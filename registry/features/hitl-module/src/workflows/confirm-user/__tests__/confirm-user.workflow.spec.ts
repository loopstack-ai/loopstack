import { TestingModule } from '@nestjs/testing';
import { LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { ConfirmUserWorkflow } from '../confirm-user.workflow';

describe('ConfirmUserWorkflow', () => {
  let module: TestingModule;
  let workflow: ConfirmUserWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    module = await createWorkflowTest().forWorkflow(ConfirmUserWorkflow).withImports(LoopCoreModule).compile();

    workflow = module.get(ConfirmUserWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('is defined', () => {
    expect(workflow).toBeDefined();
  });

  it('saves a ConfirmUserDocument and stops waiting for a decision', async () => {
    const context = createStatelessContext();

    const result = await processor.process(workflow, { markdown: '## Ready to merge\n\nProceed?' }, context);

    expect(result.hasError).toBe(false);
    expect(result.stop).toBe(true);
    expect(result.place).toBe('waiting_for_confirmation');

    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          className: 'ConfirmUserDocument',
          content: expect.objectContaining({ markdown: '## Ready to merge\n\nProceed?' }),
        }),
      ]),
    );
  });
});
