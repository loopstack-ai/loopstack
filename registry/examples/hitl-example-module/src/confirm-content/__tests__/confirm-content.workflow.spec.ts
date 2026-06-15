import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowProcessorService } from '@loopstack/core';
import { ConfirmUserWorkflow } from '@loopstack/hitl';
import { createContext, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { ConfirmContentWorkflow } from '../confirm-content.workflow';

const mockConfirmUserWorkflow = { run: vi.fn() };

describe('ConfirmContentWorkflow', () => {
  let module: TestingModule;
  let workflow: ConfirmContentWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createWorkflowTest()
      .forWorkflow(ConfirmContentWorkflow)
      .withMock(ConfirmUserWorkflow, mockConfirmUserWorkflow)
      .compile();

    workflow = module.get(ConfirmContentWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('launches ConfirmUserWorkflow with the deploy summary markdown', async () => {
    mockConfirmUserWorkflow.run.mockResolvedValue({ workflowId: 'sub-id' });

    const result = await processor.process(workflow, {}, createStatelessContext());

    expect(result.place).toBe('waiting_for_confirmation');
    expect(mockConfirmUserWorkflow.run).toHaveBeenCalledWith(
      expect.objectContaining({ markdown: expect.stringContaining('v1.2.3') }),
      { callback: { transition: 'decisionReceived' }, show: 'inline', label: 'Waiting for confirmation...' },
    );
  });

  it('proceeds with deploy when confirmed', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000008';
    const context = createContext({
      workflowEntity: { id: workflowId, place: 'waiting_for_confirmation', documents: [] },
      payload: {
        transition: {
          id: 'decisionReceived',
          workflowId,
          payload: {
            workflowId,
            status: 'completed',
            hasError: false,
            errorMessage: null,
            data: { confirmed: true, markdown: '...' },
          },
        },
      },
    });

    const result = await processor.process(workflow, {}, context);

    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentName: 'message',
          content: expect.objectContaining({ text: expect.stringContaining('proceeding') }),
        }),
      ]),
    );
  });

  it('aborts deploy when denied', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000009';
    const context = createContext({
      workflowEntity: { id: workflowId, place: 'waiting_for_confirmation', documents: [] },
      payload: {
        transition: {
          id: 'decisionReceived',
          workflowId,
          payload: {
            workflowId,
            status: 'completed',
            hasError: false,
            errorMessage: null,
            data: { confirmed: false, markdown: '...' },
          },
        },
      },
    });

    const result = await processor.process(workflow, {}, context);

    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentName: 'message',
          content: expect.objectContaining({ text: expect.stringContaining('aborting') }),
        }),
      ]),
    );
  });
});
