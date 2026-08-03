import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { executedTransitions } from '@loopstack/contracts/types';
import { WorkflowProcessorService } from '@loopstack/core';
import { createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { AskUserWorkflow } from '../ask-user.workflow.js';

describe('AskUserWorkflow', () => {
  let module: TestingModule;
  let workflow: AskUserWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    module = await createWorkflowTest().forWorkflow(AskUserWorkflow).compile();

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
            documentName: 'ask_user',
            content: expect.objectContaining({ question: 'What is your name?' }),
          }),
        ]),
      );
    });
  });

  describe('stateless resume', () => {
    it('resumes a parked run with the answer, carries state, and completes', async () => {
      const parked = await processor.process(workflow, { question: 'Proceed?' }, createStatelessContext());

      expect(parked.status).toBe('waiting');
      expect(parked.place).toBe('waiting_for_user');
      expect(parked.statelessState).toBeDefined();

      const resumed = await processor.process(
        workflow,
        { question: 'Proceed?' },
        createStatelessContext({
          payload: { transition: { id: 'userAnswered', workflowId: '', payload: { data: { answer: 'yes' } } } },
          statelessState: parked.statelessState,
        }),
      );

      expect(resumed.hasError).toBe(false);
      expect(resumed.status).toBe('completed');
      expect(resumed.place).toBe('end');
      expect(resumed.result).toEqual({ answer: 'yes' });
      // The trace rides the resume carrier, so it holds the full run — ending in the answer.
      expect(
        executedTransitions(resumed.trace)
          .map((e) => e.transitionId)
          .at(-1),
      ).toBe('userAnswered');
      // The answered document re-renders the question from carried state — proving state survived
      expect(resumed.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            documentName: 'ask_user',
            content: expect.objectContaining({ question: 'Proceed?', answer: 'yes' }),
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
            documentName: 'ask_user_options',
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
            documentName: 'ask_user_confirm',
            content: expect.objectContaining({ question: 'Proceed?' }),
          }),
        ]),
      );
    });
  });
});
