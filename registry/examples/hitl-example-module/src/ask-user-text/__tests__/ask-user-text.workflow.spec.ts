import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowProcessorService } from '@loopstack/core';
import { AskUserWorkflow } from '@loopstack/hitl';
import { createContext, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { AskUserTextWorkflow } from '../ask-user-text.workflow';

const mockAskUserWorkflow = { run: vi.fn() };

describe('AskUserTextWorkflow', () => {
  let module: TestingModule;
  let workflow: AskUserTextWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createWorkflowTest()
      .forWorkflow(AskUserTextWorkflow)
      .withMock(AskUserWorkflow, mockAskUserWorkflow)
      .compile();

    workflow = module.get(AskUserTextWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('launches AskUserWorkflow with a free-text question', async () => {
    mockAskUserWorkflow.run.mockResolvedValue({ workflowId: 'sub-id' });

    const result = await processor.process(workflow, {}, createStatelessContext());

    expect(result.hasError).toBe(false);
    expect(result.stop).toBe(true);
    expect(result.place).toBe('waiting_for_answer');
    expect(mockAskUserWorkflow.run).toHaveBeenCalledWith(
      { question: 'What is your name?' },
      { callback: { transition: 'answerReceived' }, show: 'inline', label: 'Waiting for answer...' },
    );
  });

  it('greets by name when the answer arrives', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000003';
    const context = createContext({
      workflowEntity: { id: workflowId, place: 'waiting_for_answer', documents: [] },
      payload: {
        transition: {
          id: 'answerReceived',
          workflowId,
          payload: { workflowId, status: 'completed', data: { answer: 'Ada' } },
        },
      },
    });

    const result = await processor.process(workflow, {}, context);

    expect(result.hasError).toBe(false);
    expect(result.place).toBe('end');
    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentName: 'message',
          content: expect.objectContaining({
            role: 'assistant',
            text: 'Thanks! You answered: Jakob',
          }),
        }),
      ]),
    );
  });
});
