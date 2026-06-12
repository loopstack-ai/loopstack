import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowProcessorService } from '@loopstack/core';
import { ConfirmUserWorkflow } from '@loopstack/hitl';
import { createContext, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { HitlConfirmExampleWorkflow } from '../hitl-confirm-example.workflow';

const mockConfirmUserWorkflow = {
  run: vi.fn(),
};

describe('HitlConfirmExampleWorkflow', () => {
  let module: TestingModule;
  let workflow: HitlConfirmExampleWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createWorkflowTest()
      .forWorkflow(HitlConfirmExampleWorkflow)
      .withMock(ConfirmUserWorkflow, mockConfirmUserWorkflow)
      .compile();

    workflow = module.get(HitlConfirmExampleWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('launches ConfirmUserWorkflow and stops at waiting_for_confirmation', async () => {
    mockConfirmUserWorkflow.run.mockResolvedValue({ workflowId: 'sub-id' });

    const result = await processor.process(workflow, {}, createStatelessContext());

    expect(result.hasError).toBe(false);
    expect(result.stop).toBe(true);
    expect(result.place).toBe('waiting_for_confirmation');

    expect(mockConfirmUserWorkflow.run).toHaveBeenCalledWith(
      expect.objectContaining({ markdown: expect.stringContaining('Ready to deploy') }),
      { callback: { transition: 'decisionReceived' } },
    );
  });

  it('records a "confirmed" message when the user confirms', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000001';
    const context = createContext({
      workflowEntity: {
        id: workflowId,
        place: 'waiting_for_confirmation',
        documents: [],
      },
      payload: {
        transition: {
          id: 'decisionReceived',
          workflowId,
          payload: {
            workflowId,
            status: 'completed',
            data: { confirmed: true, markdown: '...' },
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
          content: expect.objectContaining({ text: expect.stringContaining('confirmed') }),
        }),
      ]),
    );
  });

  it('records a "denied" message when the user denies', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000002';
    const context = createContext({
      workflowEntity: {
        id: workflowId,
        place: 'waiting_for_confirmation',
        documents: [],
      },
      payload: {
        transition: {
          id: 'decisionReceived',
          workflowId,
          payload: {
            workflowId,
            status: 'completed',
            data: { confirmed: false, markdown: '...' },
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
          content: expect.objectContaining({ text: expect.stringContaining('denied') }),
        }),
      ]),
    );
  });
});
