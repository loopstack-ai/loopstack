import { TestingModule } from '@nestjs/testing';
import { RunContext } from '@loopstack/common';
import { LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { CreateChatMessage, CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { CreateValue, CreateValueToolModule } from '@loopstack/create-value-tool';
import { ToolMock, createWorkflowTest } from '@loopstack/testing';
import { WorkflowToolResultsWorkflow } from '../workflow-tool-results.workflow';

describe('WorkflowToolResultsWorkflow', () => {
  let module: TestingModule;
  let workflow: WorkflowToolResultsWorkflow;
  let processor: WorkflowProcessorService;

  let mockCreateValue: ToolMock;
  let mockCreateChatMessage: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(WorkflowToolResultsWorkflow)
      .withImports(LoopCoreModule, CreateValueToolModule, CreateChatMessageToolModule)
      .withToolOverride(CreateValue)
      .withToolOverride(CreateChatMessage)
      .compile();

    workflow = module.get(WorkflowToolResultsWorkflow);
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

  describe('tool result access', () => {
    it('should access tool results by call id and index in same transition', async () => {
      const context = {} as RunContext;
      mockCreateValue.run.mockResolvedValue({ data: 'Hello World.' });
      mockCreateChatMessage.run.mockResolvedValue({ data: undefined });

      await processor.process(workflow, {}, context);

      // Verify CreateValue was called
      expect(mockCreateValue.run).toHaveBeenCalledWith(
        { input: 'Hello World.' },
      );

      // Verify CreateChatMessage received resolved template values
      expect(mockCreateChatMessage.run).toHaveBeenCalledWith(
        {
          role: 'assistant',
          content: 'Data from specific call id: Hello World.',
        },
      );

      expect(mockCreateChatMessage.run).toHaveBeenCalledWith(
        {
          role: 'assistant',
          content: 'Data from first tool call: Hello World.',
        },
      );
    });

    it('should access tool results from previous transition', async () => {
      const context = {} as RunContext;
      mockCreateValue.run.mockResolvedValue({ data: 'Hello World.' });
      mockCreateChatMessage.run.mockResolvedValue({ data: undefined });

      await processor.process(workflow, {}, context);

      expect(mockCreateChatMessage.run).toHaveBeenCalledWith(
        {
          role: 'assistant',
          content: 'Data from previous transition: Hello World.',
        },
      );
    });

    it('should access tool results using custom helper', async () => {
      const context = {} as RunContext;
      mockCreateValue.run.mockResolvedValue({ data: 'Hello World.' });
      mockCreateChatMessage.run.mockResolvedValue({ data: undefined });

      await processor.process(workflow, {}, context);

      expect(mockCreateChatMessage.run).toHaveBeenCalledWith(
        {
          role: 'assistant',
          content: 'Data access using custom helper: Hello World.',
        },
      );
    });
  });
});
