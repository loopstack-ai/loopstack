import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RunContext, WorkflowEntity } from '@loopstack/common';
import { WorkflowProcessorService } from '@loopstack/core';
import { AskUserWorkflow } from '@loopstack/hitl';
import { createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { HitlAskUserExampleWorkflow } from '../hitl-ask-user-example.workflow';

const mockAskUserWorkflow = {
  run: vi.fn(),
};

describe('HitlAskUserExampleWorkflow', () => {
  let module: TestingModule;
  let workflow: HitlAskUserExampleWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createWorkflowTest()
      .forWorkflow(HitlAskUserExampleWorkflow)
      .withMock(AskUserWorkflow, mockAskUserWorkflow)
      .compile();

    workflow = module.get(HitlAskUserExampleWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('is defined', () => {
    expect(workflow).toBeDefined();
  });

  it('launches AskUserWorkflow and stops at waiting_for_answer', async () => {
    mockAskUserWorkflow.run.mockResolvedValue({ workflowId: 'sub-id' });

    const result = await processor.process(workflow, {}, createStatelessContext());

    expect(result.hasError).toBe(false);
    expect(result.stop).toBe(true);
    expect(result.place).toBe('waiting_for_answer');

    expect(mockAskUserWorkflow.run).toHaveBeenCalledWith(
      { question: 'What is your name?' },
      { callback: { transition: 'answerReceived' } },
    );
  });

  it('saves a MessageDocument with the answer when resumed', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000001';
    const context = {
      workflowEntity: {
        id: workflowId,
        place: 'waiting_for_answer',
        documents: [],
      } as Partial<WorkflowEntity>,
      payload: {
        transition: {
          id: 'answerReceived',
          workflowId,
          payload: { workflowId, status: 'completed', data: { answer: 'Jakob' } },
        },
      },
    } as unknown as RunContext;

    const result = await processor.process(workflow, {}, context);

    expect(result.hasError).toBe(false);
    expect(result.place).toBe('end');
    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentName: 'message',
          content: expect.objectContaining({
            role: 'assistant',
            content: 'Thanks! You answered: Jakob',
          }),
        }),
      ]),
    );
  });
});
