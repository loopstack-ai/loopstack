import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WorkflowProcessorService } from '@loopstack/core';
import { createContext, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { InlineFormWorkflow } from '../inline-form.workflow';

describe('InlineFormWorkflow', () => {
  let module: TestingModule;
  let workflow: InlineFormWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    module = await createWorkflowTest().forWorkflow(InlineFormWorkflow).compile();

    workflow = module.get(InlineFormWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('is defined', () => {
    expect(workflow).toBeDefined();
  });

  it('shows the feedback form and stops at waiting_for_feedback', async () => {
    const result = await processor.process(workflow, {}, createStatelessContext());

    expect(result.hasError).toBe(false);
    expect(result.stop).toBe(true);
    expect(result.place).toBe('waiting_for_feedback');
    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentName: 'feedback_form',
          content: expect.objectContaining({ rating: 3, comment: '' }),
        }),
      ]),
    );
  });

  it('saves the submitted form and a thank-you message when resumed', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000001';
    const context = createContext({
      workflowEntity: {
        id: workflowId,
        place: 'waiting_for_feedback',
        documents: [],
      },
      payload: {
        transition: {
          id: 'submitFeedback',
          workflowId,
          payload: { rating: 5, comment: 'Loved it' },
        },
      },
    });

    const result = await processor.process(workflow, {}, context);

    expect(result.hasError).toBe(false);
    expect(result.place).toBe('end');
    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentName: 'feedback_form',
          content: expect.objectContaining({ rating: 5, comment: 'Loved it' }),
        }),
        expect.objectContaining({
          documentName: 'message',
          content: expect.objectContaining({
            role: 'assistant',
            text: expect.stringContaining('5/5'),
          }),
        }),
      ]),
    );
  });
});
