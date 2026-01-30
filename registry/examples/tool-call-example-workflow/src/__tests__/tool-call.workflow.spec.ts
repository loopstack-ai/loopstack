import { TestingModule } from '@nestjs/testing';
import { AiGenerateText, AiModule, DelegateToolCall } from '@loopstack/ai-module';
import { getBlockHelper, getBlockHelpers, getBlockTools } from '@loopstack/common';
import { BlockExecutionContextDto, WorkflowProcessorService } from '@loopstack/core';
import { CoreUiModule, CreateDocument } from '@loopstack/core-ui-module';
import { ToolMock, createWorkflowTest } from '@loopstack/testing';
import { ToolCallWorkflow } from '../tool-call.workflow';
import { GetWeather } from '../tools/get-weather.tool';

describe('ToolCallWorkflow', () => {
  let module: TestingModule;
  let workflow: ToolCallWorkflow;
  let processor: WorkflowProcessorService;

  let mockCreateDocument: ToolMock;
  let mockAiGenerateText: ToolMock;
  let mockDelegateToolCall: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(ToolCallWorkflow)
      .withImports(CoreUiModule, AiModule)
      .withProvider(GetWeather)
      .withToolOverride(CreateDocument)
      .withToolOverride(AiGenerateText)
      .withToolOverride(DelegateToolCall)
      .compile();

    workflow = module.get(ToolCallWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockCreateDocument = module.get(CreateDocument);
    mockAiGenerateText = module.get(AiGenerateText);
    mockDelegateToolCall = module.get(DelegateToolCall);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('should be defined with correct tools and helpers', () => {
      expect(workflow).toBeDefined();
      expect(getBlockTools(workflow)).toContain('createDocument');
      expect(getBlockTools(workflow)).toContain('aiGenerateText');
      expect(getBlockTools(workflow)).toContain('delegateToolCall');
      expect(getBlockTools(workflow)).toContain('getWeather');
      expect(getBlockHelpers(workflow)).toContain('isToolCall');
    });
  });

  describe('helpers', () => {
    it('isToolCall should detect tool call parts correctly', () => {
      const isToolCall = getBlockHelper(workflow, 'isToolCall')!;

      const messageWithToolCall = {
        parts: [{ type: 'tool-GetWeather', toolCallId: '123' }],
      };
      const messageWithoutToolCall = {
        parts: [{ type: 'text', text: 'Hello' }],
      };

      expect(isToolCall.call(workflow, messageWithToolCall)).toBe(true);
      expect(isToolCall.call(workflow, messageWithoutToolCall)).toBe(false);
    });
  });

  describe('workflow with tool calls', () => {
    const context = new BlockExecutionContextDto({});

    it('should execute workflow with tool call and loop back to ready state', async () => {
      const mockLlmResponseWithToolCall = {
        role: 'assistant',
        parts: [
          {
            type: 'tool-GetWeather',
            toolCallId: 'tool_call_1',
            input: { location: 'Berlin' },
            state: 'input-available',
          },
        ],
      };

      const mockToolCallResult = {
        parts: [
          {
            type: 'tool-GetWeather',
            toolCallId: 'tool_call_1',
            input: { location: 'Berlin' },
            state: 'output-available',
            output: {
              type: 'text',
              value: 'Weather in Berlin: 15°C, partly cloudy',
            },
          },
        ],
      };

      const mockFinalLlmResponse = {
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'The weather in Berlin is currently 15°C and partly cloudy.',
          },
        ],
      };

      mockCreateDocument.execute.mockResolvedValue({});
      mockAiGenerateText.execute
        .mockResolvedValueOnce({ data: mockLlmResponseWithToolCall })
        .mockResolvedValueOnce({ data: mockFinalLlmResponse });
      mockDelegateToolCall.execute.mockResolvedValue({ data: mockToolCallResult });

      const result = await processor.process(workflow, {}, context);

      expect(result.runtime.error).toBe(false);

      // Should call AiGenerateText twice (initial + after tool response)
      expect(mockAiGenerateText.execute).toHaveBeenCalledTimes(2);
      expect(mockAiGenerateText.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          llm: {
            provider: 'openai',
            model: 'gpt-4o',
          },
          messagesSearchTag: 'message',
          tools: ['getWeather'],
        }),
        expect.anything(),
        expect.anything(),
      );

      // Should call DelegateToolCall once (only when there are tool calls)
      expect(mockDelegateToolCall.execute).toHaveBeenCalledTimes(1);
      expect(mockDelegateToolCall.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          message: mockLlmResponseWithToolCall,
        }),
        expect.anything(),
        expect.anything(),
      );

      // Verify history contains expected places
      const history = result.state.caretaker.getHistory();
      const places = history.map((h) => h.metadata?.place);
      expect(places).toContain('ready');
      expect(places).toContain('prompt_executed');
      expect(places).toContain('end');
    });

    it('should go directly to end when no tool calls are needed', async () => {
      const mockLlmResponseNoToolCall = {
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'I cannot check the weather without access to weather tools.',
          },
        ],
      };

      mockCreateDocument.execute.mockResolvedValue({});
      mockAiGenerateText.execute.mockResolvedValue({ data: mockLlmResponseNoToolCall });

      const result = await processor.process(workflow, {}, context);

      expect(result.runtime.error).toBe(false);

      // Should call AiGenerateText once
      expect(mockAiGenerateText.execute).toHaveBeenCalledTimes(1);

      // Should NOT call DelegateToolCall (no tool calls in response)
      expect(mockDelegateToolCall.execute).not.toHaveBeenCalled();

      // Verify history - should go directly to end
      const history = result.state.caretaker.getHistory();
      const places = history.map((h) => h.metadata?.place);
      expect(places).toContain('ready');
      expect(places).toContain('prompt_executed');
      expect(places).toContain('end');
      // Should not loop back through ready again
      expect(places.filter((p) => p === 'ready').length).toBe(1);
    });

    it('should handle multiple tool calls in a single LLM response', async () => {
      const mockLlmResponseWithMultipleToolCalls = {
        role: 'assistant',
        parts: [
          {
            type: 'tool-GetWeather',
            toolCallId: 'tool_call_1',
            input: { location: 'Berlin' },
            state: 'input-available',
          },
          {
            type: 'tool-GetWeather',
            toolCallId: 'tool_call_2',
            input: { location: 'Munich' },
            state: 'input-available',
          },
        ],
      };

      const mockToolCallResults = {
        parts: [
          {
            type: 'tool-GetWeather',
            toolCallId: 'tool_call_1',
            input: { location: 'Berlin' },
            state: 'output-available',
            output: {
              type: 'text',
              value: 'Weather in Berlin: 15°C, partly cloudy',
            },
          },
          {
            type: 'tool-GetWeather',
            toolCallId: 'tool_call_2',
            input: { location: 'Munich' },
            state: 'output-available',
            output: {
              type: 'text',
              value: 'Weather in Munich: 18°C, sunny',
            },
          },
        ],
      };

      const mockFinalResponse = {
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'Berlin: 15°C partly cloudy. Munich: 18°C sunny.',
          },
        ],
      };

      mockCreateDocument.execute.mockResolvedValue({});
      mockAiGenerateText.execute
        .mockResolvedValueOnce({ data: mockLlmResponseWithMultipleToolCalls })
        .mockResolvedValueOnce({ data: mockFinalResponse });
      mockDelegateToolCall.execute.mockResolvedValue({ data: mockToolCallResults });

      const result = await processor.process(workflow, {}, context);

      expect(result.runtime.error).toBe(false);

      // DelegateToolCall should receive message with multiple tool calls
      expect(mockDelegateToolCall.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          message: mockLlmResponseWithMultipleToolCalls,
        }),
        expect.anything(),
        expect.anything(),
      );

      // Verify workflow completed successfully
      const history = result.state.caretaker.getHistory();
      const places = history.map((h) => h.metadata?.place);
      expect(places).toContain('end');
    });
  });
});
