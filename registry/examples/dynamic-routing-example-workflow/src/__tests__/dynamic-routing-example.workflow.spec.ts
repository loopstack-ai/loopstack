import { TestingModule } from '@nestjs/testing';
import { RunContext, getBlockTools } from '@loopstack/common';
import { WorkflowProcessorService } from '@loopstack/core';
import { CreateChatMessage, CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { ToolMock, createWorkflowTest } from '@loopstack/testing';
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
    const context = {} as RunContext;

    it('should route to placeB when value <= 100', async () => {
      mockCreateChatMessage.run.mockResolvedValue({});

      const result = await processor.process(workflow, { value: 50 }, context);

      expect(result.hasError).toBe(false);

      // Verify createChatMessage calls
      expect(mockCreateChatMessage.run).toHaveBeenCalledWith(
        { role: 'assistant', content: 'Analysing value = 50' },
      );
      expect(mockCreateChatMessage.run).toHaveBeenCalledWith(
        { role: 'assistant', content: 'Value is less or equal 100' },
      );

      // // Verify history contains expected places
      // const history = result.state.getHistory();
      // const places = history.map((h) => h.metadata?.place);
      // expect(places).toContain('prepared');
      // expect(places).toContain('placeB');
      // expect(places).toContain('end');
      // expect(places).not.toContain('placeA');
    });

    it('should route to placeC when value > 200', async () => {
      mockCreateChatMessage.run.mockResolvedValue({});

      const result = await processor.process(workflow, { value: 250 }, context);

      expect(result.hasError).toBe(false);

      // Verify createChatMessage calls
      expect(mockCreateChatMessage.run).toHaveBeenCalledWith(
        { role: 'assistant', content: 'Analysing value = 250' },
      );
      expect(mockCreateChatMessage.run).toHaveBeenCalledWith(
        { role: 'assistant', content: 'Value is greater than 200' },
      );

      // // Verify history contains expected places
      // const history = result.state.getHistory();
      // const places = history.map((h) => h.metadata?.place);
      // expect(places).toContain('prepared');
      // expect(places).toContain('placeA');
      // expect(places).toContain('placeC');
      // expect(places).toContain('end');
      // expect(places).not.toContain('placeB');
      // expect(places).not.toContain('placeD');
    });

    it('should route to placeD when 100 < value <= 200', async () => {
      mockCreateChatMessage.run.mockResolvedValue({});

      const result = await processor.process(workflow, { value: 150 }, context);

      expect(result.hasError).toBe(false);

      // Verify createChatMessage calls
      expect(mockCreateChatMessage.run).toHaveBeenCalledWith(
        { role: 'assistant', content: 'Analysing value = 150' },
      );
      expect(mockCreateChatMessage.run).toHaveBeenCalledWith(
        {
          role: 'assistant',
          content: 'Value is less or equal 200, but greater than 100',
        },
      );

      // // Verify history contains expected places
      // const history = result.state.getHistory();
      // const places = history.map((h) => h.metadata?.place);
      // expect(places).toContain('prepared');
      // expect(places).toContain('placeA');
      // expect(places).toContain('placeD');
      // expect(places).toContain('end');
      // expect(places).not.toContain('placeB');
      // expect(places).not.toContain('placeC');
    });
  });
});
