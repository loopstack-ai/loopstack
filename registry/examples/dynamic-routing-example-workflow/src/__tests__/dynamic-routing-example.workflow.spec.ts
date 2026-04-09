import { TestingModule } from '@nestjs/testing';
import { getBlockTools } from '@loopstack/common';
import { WorkflowProcessorService } from '@loopstack/core';
import { CreateChatMessage, CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { ToolMock, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { DynamicRoutingExampleWorkflow } from '../dynamic-routing-example.workflow';

describe('DynamicRoutingExampleWorkflow', () => {
  let module: TestingModule;
  let workflow: DynamicRoutingExampleWorkflow;
  let processor: WorkflowProcessorService;

  let mockCreateChatMessage: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(DynamicRoutingExampleWorkflow)
      .withImports(CreateChatMessageToolModule)
      .withToolOverride(CreateChatMessage)
      .compile();

    workflow = module.get(DynamicRoutingExampleWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockCreateChatMessage = module.get(CreateChatMessage);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('should be defined with correct tools and helpers', () => {
      expect(workflow).toBeDefined();
      expect(getBlockTools(workflow)).toContain('createChatMessage');
    });
  });

  describe('routing', () => {
    const context = createStatelessContext();

    it('should route to placeB when value <= 100', async () => {
      mockCreateChatMessage.call.mockResolvedValue({});

      const result = await processor.process(workflow, { value: 50 }, context);

      expect(result.hasError).toBe(false);

      expect(mockCreateChatMessage.call).toHaveBeenCalledWith(
        { role: 'assistant', content: 'Analysing value = 50' },
        undefined,
      );
      expect(mockCreateChatMessage.call).toHaveBeenCalledWith(
        { role: 'assistant', content: 'Value is less or equal 100' },
        undefined,
      );
    });

    it('should route to placeC when value > 200', async () => {
      mockCreateChatMessage.call.mockResolvedValue({});

      const result = await processor.process(workflow, { value: 250 }, context);

      expect(result.hasError).toBe(false);

      expect(mockCreateChatMessage.call).toHaveBeenCalledWith(
        { role: 'assistant', content: 'Analysing value = 250' },
        undefined,
      );
      expect(mockCreateChatMessage.call).toHaveBeenCalledWith(
        { role: 'assistant', content: 'Value is greater than 200' },
        undefined,
      );
    });

    it('should route to placeD when 100 < value <= 200', async () => {
      mockCreateChatMessage.call.mockResolvedValue({});

      const result = await processor.process(workflow, { value: 150 }, context);

      expect(result.hasError).toBe(false);

      expect(mockCreateChatMessage.call).toHaveBeenCalledWith(
        { role: 'assistant', content: 'Analysing value = 150' },
        undefined,
      );
      expect(mockCreateChatMessage.call).toHaveBeenCalledWith(
        { role: 'assistant', content: 'Value is less or equal 200, but greater than 100' },
        undefined,
      );
    });
  });
});
