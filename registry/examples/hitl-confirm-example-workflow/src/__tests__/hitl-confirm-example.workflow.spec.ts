import { TestingModule } from '@nestjs/testing';
import { RunContext, WorkflowEntity } from '@loopstack/common';
import { LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { ConfirmUserWorkflow } from '@loopstack/hitl';
import { createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { HitlConfirmExampleWorkflow } from '../hitl-confirm-example.workflow';

describe('HitlConfirmExampleWorkflow', () => {
  let module: TestingModule;
  let workflow: HitlConfirmExampleWorkflow;
  let processor: WorkflowProcessorService;

  const mockConfirmUser = {
    run: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await createWorkflowTest()
      .forWorkflow(HitlConfirmExampleWorkflow)
      .withImports(LoopCoreModule)
      .withMock(ConfirmUserWorkflow, mockConfirmUser)
      .compile();

    workflow = module.get(HitlConfirmExampleWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('launches ConfirmUserWorkflow and stops at waiting_for_confirmation', async () => {
    mockConfirmUser.run.mockResolvedValue({ workflowId: 'sub-id' });

    const result = await processor.process(workflow, {}, createStatelessContext());

    expect(result.hasError).toBe(false);
    expect(result.stop).toBe(true);
    expect(result.place).toBe('waiting_for_confirmation');

    expect(mockConfirmUser.run).toHaveBeenCalledWith(
      expect.objectContaining({ markdown: expect.stringContaining('Ready to deploy') }),
      expect.objectContaining({ alias: 'confirmUser', callback: { transition: 'decisionReceived' } }),
    );
  });

  it('records a "confirmed" message when the user confirms', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000001';
    const context = {
      workflowEntity: {
        id: workflowId,
        place: 'waiting_for_confirmation',
        documents: [],
      } as Partial<WorkflowEntity>,
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
    } as unknown as RunContext;

    const result = await processor.process(workflow, {}, context);

    expect(result.hasError).toBe(false);
    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          className: 'MessageDocument',
          content: expect.objectContaining({ content: expect.stringContaining('confirmed') }),
        }),
      ]),
    );
  });

  it('records a "denied" message when the user denies', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000002';
    const context = {
      workflowEntity: {
        id: workflowId,
        place: 'waiting_for_confirmation',
        documents: [],
      } as Partial<WorkflowEntity>,
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
    } as unknown as RunContext;

    const result = await processor.process(workflow, {}, context);

    expect(result.hasError).toBe(false);
    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          className: 'MessageDocument',
          content: expect.objectContaining({ content: expect.stringContaining('denied') }),
        }),
      ]),
    );
  });
});
