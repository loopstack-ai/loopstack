import { TestingModule } from '@nestjs/testing';
import { ClaudeGenerateText, ClaudeModule, DelegateToolCalls } from '@loopstack/claude-module';
import { RunContext, getBlockTools } from '@loopstack/common';
import { CreateDocument, LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { ToolMock, createWorkflowTest } from '@loopstack/testing';
import { ToolCallWorkflow } from '../tool-call.workflow';
import { GetWeather } from '../tools/get-weather.tool';

describe('ToolCallWorkflow', () => {
  let module: TestingModule;
  let workflow: ToolCallWorkflow;
  let processor: WorkflowProcessorService;

  let mockCreateDocument: ToolMock;
  let mockClaudeGenerateText: ToolMock;
  let mockDelegateToolCalls: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(ToolCallWorkflow)
      .withImports(LoopCoreModule, ClaudeModule)
      .withProvider(GetWeather)
      .withToolOverride(CreateDocument)
      .withToolOverride(ClaudeGenerateText)
      .withToolOverride(DelegateToolCalls)
      .compile();

    workflow = module.get(ToolCallWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockCreateDocument = module.get(CreateDocument);
    mockClaudeGenerateText = module.get(ClaudeGenerateText);
    mockDelegateToolCalls = module.get(DelegateToolCalls);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('should be defined with correct tools', () => {
      expect(workflow).toBeDefined();
      expect(getBlockTools(workflow)).toContain('createDocument');
      expect(getBlockTools(workflow)).toContain('claudeGenerateText');
      expect(getBlockTools(workflow)).toContain('delegateToolCalls');
      expect(getBlockTools(workflow)).toContain('getWeather');
    });
  });

  describe('workflow with tool calls', () => {
    const context = {} as RunContext;

    it('should execute workflow with tool call and loop back to ready state', async () => {
      const mockLlmResponseWithToolCall = {
        id: 'msg_1',
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'tool_call_1',
            name: 'getWeather',
            input: { location: 'Berlin' },
          },
        ],
      };

      const mockToolCallResult = {
        allCompleted: true,
        toolResults: [
          {
            type: 'tool_result',
            tool_use_id: 'tool_call_1',
            content: 'Weather in Berlin: 15°C, partly cloudy',
          },
        ],
      };

      const mockFinalLlmResponse = {
        id: 'msg_2',
        stop_reason: 'end_turn',
        content: [
          {
            type: 'text',
            text: 'The weather in Berlin is currently 15°C and partly cloudy.',
          },
        ],
      };

      mockCreateDocument.run.mockResolvedValue({});
      mockClaudeGenerateText.run
        .mockResolvedValueOnce({ data: mockLlmResponseWithToolCall })
        .mockResolvedValueOnce({ data: mockFinalLlmResponse });
      mockDelegateToolCalls.run.mockResolvedValue({ data: mockToolCallResult });

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);

      // Should call ClaudeGenerateText twice (initial + after tool response)
      expect(mockClaudeGenerateText.run).toHaveBeenCalledTimes(2);
      expect(mockClaudeGenerateText.run).toHaveBeenCalledWith(
        expect.objectContaining({
          claude: {
            model: 'claude-sonnet-4-6',
          },
          messagesSearchTag: 'message',
          tools: ['getWeather'],
        }),
      );

      // Should call DelegateToolCalls once (only when there are tool calls)
      expect(mockDelegateToolCalls.run).toHaveBeenCalledTimes(1);
      expect(mockDelegateToolCalls.run).toHaveBeenCalledWith(
        expect.objectContaining({
          message: mockLlmResponseWithToolCall,
        }),
      );
    });

    it('should go directly to end when no tool calls are needed', async () => {
      const mockLlmResponseNoToolCall = {
        id: 'msg_1',
        stop_reason: 'end_turn',
        content: [
          {
            type: 'text',
            text: 'I cannot check the weather without access to weather tools.',
          },
        ],
      };

      mockCreateDocument.run.mockResolvedValue({});
      mockClaudeGenerateText.run.mockResolvedValue({ data: mockLlmResponseNoToolCall });

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);

      // Should call ClaudeGenerateText once
      expect(mockClaudeGenerateText.run).toHaveBeenCalledTimes(1);

      // Should NOT call DelegateToolCalls (no tool calls in response)
      expect(mockDelegateToolCalls.run).not.toHaveBeenCalled();
    });

    it('should handle multiple tool calls in a single LLM response', async () => {
      const mockLlmResponseWithMultipleToolCalls = {
        id: 'msg_1',
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'tool_call_1',
            name: 'getWeather',
            input: { location: 'Berlin' },
          },
          {
            type: 'tool_use',
            id: 'tool_call_2',
            name: 'getWeather',
            input: { location: 'Munich' },
          },
        ],
      };

      const mockToolCallResults = {
        allCompleted: true,
        toolResults: [
          {
            type: 'tool_result',
            tool_use_id: 'tool_call_1',
            content: 'Weather in Berlin: 15°C, partly cloudy',
          },
          {
            type: 'tool_result',
            tool_use_id: 'tool_call_2',
            content: 'Weather in Munich: 18°C, sunny',
          },
        ],
      };

      const mockFinalResponse = {
        id: 'msg_2',
        stop_reason: 'end_turn',
        content: [
          {
            type: 'text',
            text: 'Berlin: 15°C partly cloudy. Munich: 18°C sunny.',
          },
        ],
      };

      mockCreateDocument.run.mockResolvedValue({});
      mockClaudeGenerateText.run
        .mockResolvedValueOnce({ data: mockLlmResponseWithMultipleToolCalls })
        .mockResolvedValueOnce({ data: mockFinalResponse });
      mockDelegateToolCalls.run.mockResolvedValue({ data: mockToolCallResults });

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);

      // DelegateToolCalls should receive message with multiple tool calls
      expect(mockDelegateToolCalls.run).toHaveBeenCalledWith(
        expect.objectContaining({
          message: mockLlmResponseWithMultipleToolCalls,
        }),
      );
    });
  });
});
