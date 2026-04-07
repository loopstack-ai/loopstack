import { TestingModule } from '@nestjs/testing';
import { RunContext } from '@loopstack/common';
import { WorkflowProcessorService } from '@loopstack/core';
import { CreateChatMessage, CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { CreateValue, CreateValueToolModule } from '@loopstack/create-value-tool';
import { ToolMock, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
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

  it('should execute workflow and pass state between transitions', async () => {
    const context = createStatelessContext();

    mockCreateValue.call.mockResolvedValue({ data: 'Hello :)' });
    mockCreateChatMessage.call.mockResolvedValue({ data: undefined });

    const result = await processor.process(workflow, {}, context);

    expect(result.hasError).toBe(false);

    // Verify createValue was called
    expect(mockCreateValue.call).toHaveBeenCalledWith({ input: 'Hello :)' });

    // Verify createChatMessage was called with state from previous transition
    expect(mockCreateChatMessage.call).toHaveBeenCalledTimes(2);
    expect(mockCreateChatMessage.call).toHaveBeenCalledWith({
      role: 'assistant',
      content: 'Data from state: Hello :)',
    });
    expect(mockCreateChatMessage.call).toHaveBeenCalledWith({
      role: 'assistant',
      content: 'Use workflow helper method: HELLO :)',
    });
  });
});
