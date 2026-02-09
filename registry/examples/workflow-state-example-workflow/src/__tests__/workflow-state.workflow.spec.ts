import { TestingModule } from '@nestjs/testing';
import { RunContext, getBlockHelper } from '@loopstack/common';
import { WorkflowProcessorService } from '@loopstack/core';
import { CreateChatMessage, CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { CreateValue, CreateValueToolModule } from '@loopstack/create-value-tool';
import { ToolMock, createWorkflowTest } from '@loopstack/testing';
import { WorkflowStateWorkflow } from '../workflow-state.workflow';

describe('WorkflowStateWorkflow', () => {
  let module: TestingModule;
  let workflow: WorkflowStateWorkflow;
  let processor: WorkflowProcessorService;

  let mockCreateValue: ToolMock;
  let mockCreateChatMessage: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(WorkflowStateWorkflow)
      .withImports(CreateValueToolModule, CreateChatMessageToolModule)
      .withToolOverride(CreateValue)
      .withToolOverride(CreateChatMessage)
      .compile();

    workflow = module.get(WorkflowStateWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockCreateValue = module.get(CreateValue);
    mockCreateChatMessage = module.get(CreateChatMessage);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(workflow).toBeDefined();
  });

  it('should have messageInUpperCase helper', () => {
    const helper = getBlockHelper(workflow, 'messageInUpperCase');
    expect(helper).toBeDefined();
    expect(helper!.call(workflow, 'hello')).toBe('HELLO');
  });

  it('should execute workflow and pass state between tool calls', async () => {
    const context = new RunContext({} as RunContext);

    mockCreateValue.execute.mockResolvedValue({ data: 'Hello :)' });

    const result = await processor.process(workflow, {}, context);

    expect(result.error).toBe(false);

    // Verify createValue was called
    expect(mockCreateValue.execute).toHaveBeenCalledWith(
      { input: 'Hello :)' },
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );

    // Verify createChatMessage was called twice with interpolated state
    expect(mockCreateChatMessage.execute).toHaveBeenCalledTimes(3);
    expect(mockCreateChatMessage.execute).toHaveBeenCalledWith(
      { role: 'assistant', content: 'Data from runtime: Hello :)' },
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
    expect(mockCreateChatMessage.execute).toHaveBeenCalledWith(
      { role: 'assistant', content: 'Data from state: Hello :)' },
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
    expect(mockCreateChatMessage.execute).toHaveBeenCalledWith(
      {
        role: 'assistant',
        content: 'Use workflow helper method: HELLO :)',
      },
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });
});
