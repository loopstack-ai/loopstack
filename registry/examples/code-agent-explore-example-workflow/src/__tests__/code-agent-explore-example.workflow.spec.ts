import { TestingModule } from '@nestjs/testing';
import { ExploreAgentWorkflow } from '@loopstack/code-agent';
import { RunContext, WorkflowEntity } from '@loopstack/common';
import { LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { CodeAgentExploreExampleWorkflow } from '../code-agent-explore-example.workflow';

describe('CodeAgentExploreExampleWorkflow', () => {
  let module: TestingModule;
  let workflow: CodeAgentExploreExampleWorkflow;
  let processor: WorkflowProcessorService;

  const mockExploreAgent = {
    run: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await createWorkflowTest()
      .forWorkflow(CodeAgentExploreExampleWorkflow)
      .withImports(LoopCoreModule)
      .withMock(ExploreAgentWorkflow, mockExploreAgent)
      .compile();

    workflow = module.get(CodeAgentExploreExampleWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('launches ExploreAgentWorkflow and stops at exploring', async () => {
    mockExploreAgent.run.mockResolvedValue({ workflowId: 'sub-id' });

    const result = await processor.process(workflow, {}, createStatelessContext());

    expect(result.hasError).toBe(false);
    expect(result.stop).toBe(true);
    expect(result.place).toBe('exploring');

    expect(mockExploreAgent.run).toHaveBeenCalledWith(
      expect.objectContaining({ instructions: expect.any(String) }),
      expect.objectContaining({ alias: 'exploreAgent', callback: { transition: 'exploreComplete' } }),
    );

    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          className: 'LinkDocument',
          content: expect.objectContaining({ workflowId: 'sub-id' }),
        }),
      ]),
    );
  });

  it('saves the agent response as a MessageDocument when resumed', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000001';
    const context = {
      workflowEntity: {
        id: workflowId,
        place: 'exploring',
        documents: [],
      } as Partial<WorkflowEntity>,
      payload: {
        transition: {
          id: 'exploreComplete',
          workflowId,
          payload: {
            workflowId,
            status: 'completed',
            data: { response: '- src/main.ts\n- AppModule' },
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
          content: expect.objectContaining({ content: expect.stringContaining('AppModule') }),
        }),
      ]),
    );
  });
});
