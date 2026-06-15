import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowProcessorService } from '@loopstack/core';
import { AskUserWorkflow } from '@loopstack/hitl';
import { createContext, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { AskUserOptionsWorkflow } from '../ask-user-options.workflow';

const mockAskUserWorkflow = { run: vi.fn() };

describe('AskUserOptionsWorkflow', () => {
  let module: TestingModule;
  let workflow: AskUserOptionsWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createWorkflowTest()
      .forWorkflow(AskUserOptionsWorkflow)
      .withMock(AskUserWorkflow, mockAskUserWorkflow)
      .compile();

    workflow = module.get(AskUserOptionsWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('launches AskUserWorkflow in options mode with allowCustomAnswer', async () => {
    mockAskUserWorkflow.run.mockResolvedValue({ workflowId: 'sub-id' });

    const result = await processor.process(workflow, {}, createStatelessContext());

    expect(result.hasError).toBe(false);
    expect(result.place).toBe('waiting_for_choice');
    expect(mockAskUserWorkflow.run).toHaveBeenCalledWith(
      {
        question: 'Which environment should we deploy to?',
        mode: 'options',
        options: ['staging', 'production'],
        allowCustomAnswer: true,
      },
      { callback: { transition: 'choiceReceived' }, show: 'inline', label: 'Waiting for choice...' },
    );
  });

  it('records a known environment choice', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000004';
    const context = createContext({
      workflowEntity: { id: workflowId, place: 'waiting_for_choice', documents: [] },
      payload: {
        transition: {
          id: 'choiceReceived',
          workflowId,
          payload: {
            workflowId,
            status: 'completed',
            hasError: false,
            errorMessage: null,
            data: { answer: 'production' },
          },
        },
      },
    });

    const result = await processor.process(workflow, {}, context);

    expect(result.hasError).toBe(false);
    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentName: 'message',
          content: expect.objectContaining({ text: 'Deploying to production.' }),
        }),
      ]),
    );
  });

  it('records a custom environment when the user enters free text', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000005';
    const context = createContext({
      workflowEntity: { id: workflowId, place: 'waiting_for_choice', documents: [] },
      payload: {
        transition: {
          id: 'choiceReceived',
          workflowId,
          payload: {
            workflowId,
            status: 'completed',
            hasError: false,
            errorMessage: null,
            data: { answer: 'edge-eu' },
          },
        },
      },
    });

    const result = await processor.process(workflow, {}, context);

    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentName: 'message',
          content: expect.objectContaining({ text: 'Custom environment selected: edge-eu' }),
        }),
      ]),
    );
  });
});
