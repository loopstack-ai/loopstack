import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SequenceWorkflow, WorkflowProcessorService } from '@loopstack/core';
import { createContext, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { RunSubWorkflowExampleSequenceWorkflow } from '../run-sub-workflow-example-sequence.workflow';

const mockSequence = {
  run: vi.fn(),
};

describe('RunSubWorkflowExampleSequenceWorkflow', () => {
  let module: TestingModule;
  let workflow: RunSubWorkflowExampleSequenceWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createWorkflowTest()
      .forWorkflow(RunSubWorkflowExampleSequenceWorkflow)
      .withMock(SequenceWorkflow, mockSequence)
      .compile();

    workflow = module.get(RunSubWorkflowExampleSequenceWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    if (module) await module.close();
  });

  it('launches SequenceWorkflow with three array items and stops at awaiting', async () => {
    mockSequence.run.mockResolvedValue({ workflowId: 'sequence-id' });

    const result = await processor.process(workflow, {}, createStatelessContext());

    expect(result.hasError).toBe(false);
    expect(result.place).toBe('awaiting');

    const [args, options] = mockSequence.run.mock.calls[0];
    expect(Array.isArray(args.items)).toBe(true);
    expect(args.items).toHaveLength(3);
    expect(args.items.map((i: { label?: string }) => i.label)).toEqual(['step-1', 'step-2', 'step-3']);
    expect(options.callback.transition).toBe('onComplete');
  });

  it('on callback, writes one message per item in order and completes', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000002';

    const sequencePayload = {
      workflowId: 'sequence-id',
      status: 'completed',
      hasError: false,
      errorMessage: null,
      data: {
        results: [
          { key: 'step-1', status: 'completed', data: { message: 'A' } },
          { key: 'step-2', status: 'completed', data: { message: 'B' } },
          { key: 'step-3', status: 'completed', data: { message: 'C' } },
        ],
        hasErrors: false,
        errorCount: 0,
      },
    };

    const context = createContext({
      workflowEntity: { id: workflowId, place: 'awaiting', documents: [] },
      payload: {
        transition: { id: 'onComplete', workflowId, payload: sequencePayload },
      },
    });

    const result = await processor.process(workflow, {}, context);

    expect(result.hasError).toBe(false);
    expect(result.place).toBe('end');

    const messageDocs = result.documents?.filter((d) => d.documentName === 'message') ?? [];
    expect(messageDocs.map((d) => (d.content as { text: string }).text)).toEqual([
      'Sequence step-1: A',
      'Sequence step-2: B',
      'Sequence step-3: C',
    ]);
  });
});
