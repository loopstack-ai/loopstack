import { TestingModule } from '@nestjs/testing';
import { DynamicRoutingExampleWorkflow } from '../dynamic-routing-example.workflow';
import {
  BlockExecutionContextDto,
  LoopCoreModule,
  WorkflowProcessorService,
} from '@loopstack/core';
import { createWorkflowTest, ToolMock } from '@loopstack/testing';
import { CreateChatMessage, CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';

describe('DynamicRoutingExampleWorkflow', () => {
  let module: TestingModule;
  let workflow: DynamicRoutingExampleWorkflow;
  let processor: WorkflowProcessorService;

  let mockCreateChatMessage: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(DynamicRoutingExampleWorkflow)
      .withImports(LoopCoreModule, CreateChatMessageToolModule)
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
      expect(workflow.tools).toContain('createChatMessage');
      expect(workflow.helpers).toContain('gt');
    });

    it('should apply default argument value', () => {
      const result = workflow.validate({});
      expect(result).toEqual({ value: 150 });
    });
  });

  describe('helpers', () => {
    it('gt should compare numbers correctly', () => {
      const gt = workflow.getHelper('gt')!;
      expect(gt.call(workflow, 101, 100)).toBe(true);
      expect(gt.call(workflow, 100, 100)).toBe(false);
    });
  });

  describe('routing', () => {
    const context = new BlockExecutionContextDto({});

    it('should route to placeB when value <= 100', async () => {
      mockCreateChatMessage.execute.mockResolvedValue({});

      const result = await processor.process(workflow, { value: 50 }, context);

      expect(result.runtime.error).toBe(false);

      // Verify createChatMessage calls
      expect(mockCreateChatMessage.execute).toHaveBeenCalledWith(
        { role: 'assistant', content: 'Analysing value = 50' },
        expect.anything(),
        expect.anything(),
      );
      expect(mockCreateChatMessage.execute).toHaveBeenCalledWith(
        { role: 'assistant', content: 'Value is less or equal 100' },
        expect.anything(),
        expect.anything(),
      );

      // Verify history contains expected places
      const history = result.state.caretaker.getHistory();
      const places = history.map((h) => h.metadata?.place);
      expect(places).toContain('prepared');
      expect(places).toContain('placeB');
      expect(places).toContain('end');
      expect(places).not.toContain('placeA');
    });

    it('should route to placeC when value > 200', async () => {
      mockCreateChatMessage.execute.mockResolvedValue({});

      const result = await processor.process(workflow, { value: 250 }, context);

      expect(result.runtime.error).toBe(false);

      // Verify createChatMessage calls
      expect(mockCreateChatMessage.execute).toHaveBeenCalledWith(
        { role: 'assistant', content: 'Analysing value = 250' },
        expect.anything(),
        expect.anything(),
      );
      expect(mockCreateChatMessage.execute).toHaveBeenCalledWith(
        { role: 'assistant', content: 'Value is greater than 200' },
        expect.anything(),
        expect.anything(),
      );

      // Verify history contains expected places
      const history = result.state.caretaker.getHistory();
      const places = history.map((h) => h.metadata?.place);
      expect(places).toContain('prepared');
      expect(places).toContain('placeA');
      expect(places).toContain('placeC');
      expect(places).toContain('end');
      expect(places).not.toContain('placeB');
      expect(places).not.toContain('placeD');
    });

    it('should route to placeD when 100 < value <= 200', async () => {
      mockCreateChatMessage.execute.mockResolvedValue({});

      const result = await processor.process(workflow, { value: 150 }, context);

      expect(result.runtime.error).toBe(false);

      // Verify createChatMessage calls
      expect(mockCreateChatMessage.execute).toHaveBeenCalledWith(
        { role: 'assistant', content: 'Analysing value = 150' },
        expect.anything(),
        expect.anything(),
      );
      expect(mockCreateChatMessage.execute).toHaveBeenCalledWith(
        {
          role: 'assistant',
          content: 'Value is less or equal 200, but greater than 100',
        },
        expect.anything(),
        expect.anything(),
      );

      // Verify history contains expected places
      const history = result.state.caretaker.getHistory();
      const places = history.map((h) => h.metadata?.place);
      expect(places).toContain('prepared');
      expect(places).toContain('placeA');
      expect(places).toContain('placeD');
      expect(places).toContain('end');
      expect(places).not.toContain('placeB');
      expect(places).not.toContain('placeC');
    });
  });
});
