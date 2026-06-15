import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowProcessorService } from '@loopstack/core';
import { AskUserWorkflow } from '@loopstack/hitl';
import { createContext, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { AskUserConfirmWorkflow } from '../ask-user-confirm.workflow';

const mockAskUserWorkflow = { run: vi.fn() };

describe('AskUserConfirmWorkflow', () => {
  let module: TestingModule;
  let workflow: AskUserConfirmWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createWorkflowTest()
      .forWorkflow(AskUserConfirmWorkflow)
      .withMock(AskUserWorkflow, mockAskUserWorkflow)
      .compile();

    workflow = module.get(AskUserConfirmWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('launches AskUserWorkflow in confirm mode', async () => {
    mockAskUserWorkflow.run.mockResolvedValue({ workflowId: 'sub-id' });

    const result = await processor.process(workflow, {}, createStatelessContext());

    expect(result.place).toBe('waiting_for_yes_no');
    expect(mockAskUserWorkflow.run).toHaveBeenCalledWith(
      { question: 'Send the email now?', mode: 'confirm' },
      { callback: { transition: 'decisionReceived' }, show: 'inline', label: 'Waiting for yes/no...' },
    );
  });

  it('sends the email when the user answers yes', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000006';
    const context = createContext({
      workflowEntity: { id: workflowId, place: 'waiting_for_yes_no', documents: [] },
      payload: {
        transition: {
          id: 'decisionReceived',
          workflowId,
          payload: { workflowId, status: 'completed', data: { answer: 'yes' } },
        },
      },
    });

    const result = await processor.process(workflow, {}, context);

    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentName: 'message',
          content: expect.objectContaining({ text: 'Sending the email now.' }),
        }),
      ]),
    );
  });

  it('skips when the user answers no', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000007';
    const context = createContext({
      workflowEntity: { id: workflowId, place: 'waiting_for_yes_no', documents: [] },
      payload: {
        transition: {
          id: 'decisionReceived',
          workflowId,
          payload: { workflowId, status: 'completed', data: { answer: 'no' } },
        },
      },
    });

    const result = await processor.process(workflow, {}, context);

    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentName: 'message',
          content: expect.objectContaining({ text: 'Skipping — email was not sent.' }),
        }),
      ]),
    );
  });
});
