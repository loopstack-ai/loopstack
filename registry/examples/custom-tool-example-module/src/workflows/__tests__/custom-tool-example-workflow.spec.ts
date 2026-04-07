import { TestingModule } from '@nestjs/testing';
import { z } from 'zod';
import { getBlockArgsSchema, getBlockConfig, getBlockTools } from '@loopstack/common';
import { WorkflowProcessorService } from '@loopstack/core';
import { CreateChatMessage, CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { ToolMock, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { CounterTool, MathSumTool } from '../../tools';
import { CustomToolExampleWorkflow } from '../custom-tool-example.workflow';

describe('CustomToolExampleWorkflow', () => {
  let module: TestingModule;
  let workflow: CustomToolExampleWorkflow;
  let processor: WorkflowProcessorService;

  let mockMathSumTool: ToolMock;
  let mockCounterTool: ToolMock;
  let mockCreateChatMessageTool: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(CustomToolExampleWorkflow)
      .withImports(CreateChatMessageToolModule)
      .withToolMock(MathSumTool)
      .withToolMock(CounterTool)
      .withToolOverride(CreateChatMessage)
      .compile();

    workflow = module.get(CustomToolExampleWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockMathSumTool = module.get(MathSumTool);
    mockCounterTool = module.get(CounterTool);
    mockCreateChatMessageTool = module.get(CreateChatMessage);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(workflow).toBeDefined();
    });

    it('should have argsSchema defined', () => {
      expect(getBlockArgsSchema(workflow)).toBeDefined();
      expect(getBlockArgsSchema(workflow)).toBeInstanceOf(z.ZodType);
    });

    it('should have config defined', () => {
      expect(getBlockConfig(workflow)).toBeDefined();
    });

    it('should have all tools available via workflow.tools', () => {
      expect(getBlockTools(workflow)).toBeDefined();
      expect(Array.isArray(getBlockTools(workflow))).toBe(true);
      expect(getBlockTools(workflow)).toContain('counterTool');
      expect(getBlockTools(workflow)).toContain('createChatMessage');
      expect(getBlockTools(workflow)).toContain('mathTool');
      expect(getBlockTools(workflow)).toHaveLength(3);
    });
  });

  describe('arguments', () => {
    it('should validate arguments with correct schema', () => {
      const validArgs = { a: 10, b: 20 };

      const schema = getBlockArgsSchema(workflow);
      const result = schema?.parse(validArgs);
      expect(result).toEqual(validArgs);
    });

    it('should apply default values when arguments are missing', () => {
      const schema = getBlockArgsSchema(workflow);
      const result = schema?.parse({});
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should apply partial default values', () => {
      const schema = getBlockArgsSchema(workflow);
      const result = schema?.parse({ a: 5 });
      expect(result).toEqual({ a: 5, b: 2 });
    });

    it('should throw error for invalid argument types', () => {
      const schema = getBlockArgsSchema(workflow);
      expect(() => schema?.parse({ a: 'not a number', b: 20 })).toThrow();
    });
  });

  describe('workflow execution', () => {
    it('should execute calculate transition and stop at waiting_for_user', async () => {
      const context = createStatelessContext();

      // Configure mocks for this test
      mockMathSumTool.call.mockResolvedValue({ data: 30 });
      mockCounterTool.call
        .mockResolvedValueOnce({ data: 1 })
        .mockResolvedValueOnce({ data: 2 })
        .mockResolvedValueOnce({ data: 3 });
      mockCreateChatMessageTool.call.mockResolvedValue({ data: undefined });

      // Execute
      const result = await processor.process(workflow, { a: 10, b: 20 }, context);

      expect(result).toBeDefined();
      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(true);
      expect(result.place).toBe('waiting_for_user');

      // Tool calls
      expect(mockMathSumTool.call).toHaveBeenCalledWith({ a: 10, b: 20 });
      expect(mockCounterTool.call).toHaveBeenCalledTimes(3);
      expect(mockCreateChatMessageTool.call).toHaveBeenCalledTimes(3);

      // Verify createChatMessage was called with calculation result
      expect(mockCreateChatMessageTool.call).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'assistant',
          content: expect.stringContaining('10 + 20 = 30'),
        }),
      );
    });
  });
});
