import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FanOutWorkflow } from '@loopstack/core';
import { WorkflowProcessorService } from '@loopstack/core';
import { createContext, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { RunSubWorkflowExampleFanOutWorkflow } from '../run-sub-workflow-example-fan-out.workflow';

const mockFanOut = {
  run: vi.fn(),
};

describe('RunSubWorkflowExampleFanOutWorkflow', () => {
  let module: TestingModule;
  let workflow: RunSubWorkflowExampleFanOutWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createWorkflowTest()
      .forWorkflow(RunSubWorkflowExampleFanOutWorkflow)
      .withMock(FanOutWorkflow, mockFanOut)
      .compile();

    workflow = module.get(RunSubWorkflowExampleFanOutWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    if (module) await module.close();
  });

  it('launches FanOutWorkflow with three named items and stops at awaiting', async () => {
    mockFanOut.run.mockResolvedValue({ workflowId: 'fanout-id' });

    const result = await processor.process(workflow, {}, createStatelessContext());

    expect(result.hasError).toBe(false);
    expect(result.place).toBe('awaiting');
    expect(mockFanOut.run).toHaveBeenCalledTimes(1);

    const [args, options] = mockFanOut.run.mock.calls[0];
    expect(Object.keys(args.items)).toEqual(['first', 'second', 'third']);
    expect(options.callback.transition).toBe('onAllDone');
  });

  it('on callback, writes one message per child and completes', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000001';

    const fanOutPayload = {
      workflowId: 'fanout-id',
      status: 'completed',
      hasError: false,
      errorMessage: null,
      data: {
        results: {
          first: { status: 'completed', data: { message: 'Hi from first' } },
          second: { status: 'completed', data: { message: 'Hi from second' } },
          third: { status: 'completed', data: { message: 'Hi from third' } },
        },
        hasErrors: false,
        errorCount: 0,
      },
    };

    const context = createContext({
      workflowEntity: { id: workflowId, place: 'awaiting', documents: [] },
      payload: {
        transition: { id: 'onAllDone', workflowId, payload: fanOutPayload },
      },
    });

    const result = await processor.process(workflow, {}, context);

    expect(result.hasError).toBe(false);
    expect(result.place).toBe('end');

    const messageDocs = result.documents?.filter((d) => d.documentName === 'message') ?? [];
    expect(messageDocs).toHaveLength(3);
    expect(messageDocs.map((d) => (d.content as { text: string }).text)).toEqual([
      'Fan-out first: Hi from first',
      'Fan-out second: Hi from second',
      'Fan-out third: Hi from third',
    ]);
  });
});
