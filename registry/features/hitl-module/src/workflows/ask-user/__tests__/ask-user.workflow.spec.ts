import { TestingModule } from '@nestjs/testing';
import { LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { AskUserWorkflow } from '../ask-user.workflow';

describe('AskUserWorkflow', () => {
  let module: TestingModule;
  let workflow: AskUserWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    module = await createWorkflowTest().forWorkflow(AskUserWorkflow).withImports(LoopCoreModule).compile();

    workflow = module.get(AskUserWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('is defined', () => {
    expect(workflow).toBeDefined();
  });

  describe('text mode (default)', () => {
    it('renders an AskUserDocument with the question and stops waiting for the user', async () => {
      const context = createStatelessContext();

      const result = await processor.process(workflow, { question: 'What is your name?' }, context);

      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(true);
      expect(result.place).toBe('waiting_for_user');

      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            className: 'AskUserDocument',
            content: expect.objectContaining({ question: 'What is your name?' }),
          }),
        ]),
      );
    });
  });

  describe('options mode', () => {
    it('renders an AskUserOptionsDocument with the options list', async () => {
      const context = createStatelessContext();

      const result = await processor.process(
        workflow,
        { question: 'Environment?', mode: 'options', options: ['staging', 'production'], allowCustomAnswer: false },
        context,
      );

      expect(result.hasError).toBe(false);
      expect(result.place).toBe('waiting_for_user');
      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            className: 'AskUserOptionsDocument',
            content: expect.objectContaining({
              question: 'Environment?',
              options: ['staging', 'production'],
              allowCustomAnswer: false,
            }),
          }),
        ]),
      );
    });
  });

  describe('confirm mode', () => {
    it('renders an AskUserConfirmDocument', async () => {
      const context = createStatelessContext();

      const result = await processor.process(workflow, { question: 'Proceed?', mode: 'confirm' }, context);

      expect(result.hasError).toBe(false);
      expect(result.place).toBe('waiting_for_user');
      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            className: 'AskUserConfirmDocument',
            content: expect.objectContaining({ question: 'Proceed?' }),
          }),
        ]),
      );
    });
  });
});
