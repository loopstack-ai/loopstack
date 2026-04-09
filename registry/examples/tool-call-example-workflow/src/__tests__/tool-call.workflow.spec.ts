import { TestingModule } from '@nestjs/testing';
import { ClaudeGenerateText, ClaudeModule, DelegateToolCalls } from '@loopstack/claude-module';
import { getBlockTools } from '@loopstack/common';
import { LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { ToolMock, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { ToolCallWorkflow } from '../tool-call.workflow';
import { GetWeather } from '../tools/get-weather.tool';

describe('ToolCallWorkflow', () => {
  let module: TestingModule;
  let workflow: ToolCallWorkflow;
  let processor: WorkflowProcessorService;

  let mockClaudeGenerateText: ToolMock;
  let mockDelegateToolCalls: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(ToolCallWorkflow)
      .withImports(LoopCoreModule, ClaudeModule)
      .withProvider(GetWeather)
      .withToolOverride(ClaudeGenerateText)
      .withToolOverride(DelegateToolCalls)
      .compile();

    workflow = module.get(ToolCallWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockClaudeGenerateText = module.get(ClaudeGenerateText);
    mockDelegateToolCalls = module.get(DelegateToolCalls);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('should be defined with correct tools', () => {
      expect(workflow).toBeDefined();
      expect(getBlockTools(workflow)).toContain('claudeGenerateText');
      expect(getBlockTools(workflow)).toContain('delegateToolCalls');
      expect(getBlockTools(workflow)).toContain('getWeather');
    });
  });

  describe('workflow with tool calls', () => {
    const context = createStatelessContext();

    it('should execute workflow with tool call and loop back to ready state', async () => {
      const mockLlmResponseWithToolCall = {
        id: 'msg_1',
        role: 'assistant',
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
        role: 'assistant',
        stop_reason: 'end_turn',
        content: [
          {
            type: 'text',
            text: 'The weather in Berlin is currently 15°C and partly cloudy.',
          },
        ],
      };

      mockClaudeGenerateText.call
        .mockResolvedValueOnce({ data: mockLlmResponseWithToolCall })
        .mockResolvedValueOnce({ data: mockFinalLlmResponse });
      mockDelegateToolCalls.call.mockResolvedValue({ data: mockToolCallResult });

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);

      // Should call ClaudeGenerateText twice (initial + after tool response)
      expect(mockClaudeGenerateText.call).toHaveBeenCalledTimes(2);
      expect(mockClaudeGenerateText.call).toHaveBeenCalledWith(
        expect.objectContaining({
          claude: {
            model: 'claude-sonnet-4-6',
          },
          messagesSearchTag: 'message',
          tools: ['getWeather'],
        }),
        undefined,
      );

      // Should call DelegateToolCalls once (only when there are tool calls)
      expect(mockDelegateToolCalls.call).toHaveBeenCalledTimes(1);
      expect(mockDelegateToolCalls.call).toHaveBeenCalledWith(
        expect.objectContaining({
          message: mockLlmResponseWithToolCall,
        }),
        undefined,
      );
    });

    it('should go directly to end when no tool calls are needed', async () => {
      const mockLlmResponseNoToolCall = {
        id: 'msg_1',
        role: 'assistant',
        stop_reason: 'end_turn',
        content: [
          {
            type: 'text',
            text: 'I cannot check the weather without access to weather tools.',
          },
        ],
      };

      mockClaudeGenerateText.call.mockResolvedValue({ data: mockLlmResponseNoToolCall });

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);

      // Should call ClaudeGenerateText once
      expect(mockClaudeGenerateText.call).toHaveBeenCalledTimes(1);

      // Should NOT call DelegateToolCalls (no tool calls in response)
      expect(mockDelegateToolCalls.call).not.toHaveBeenCalled();
    });

    it('should handle multiple tool calls in a single LLM response', async () => {
      const mockLlmResponseWithMultipleToolCalls = {
        id: 'msg_1',
        role: 'assistant',
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
        role: 'assistant',
        stop_reason: 'end_turn',
        content: [
          {
            type: 'text',
            text: 'Berlin: 15°C partly cloudy. Munich: 18°C sunny.',
          },
        ],
      };

      mockClaudeGenerateText.call
        .mockResolvedValueOnce({ data: mockLlmResponseWithMultipleToolCalls })
        .mockResolvedValueOnce({ data: mockFinalResponse });
      mockDelegateToolCalls.call.mockResolvedValue({ data: mockToolCallResults });

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);

      // DelegateToolCalls should receive message with multiple tool calls
      expect(mockDelegateToolCalls.call).toHaveBeenCalledWith(
        expect.objectContaining({
          message: mockLlmResponseWithMultipleToolCalls,
        }),
        undefined,
      );
    });
  });
});
