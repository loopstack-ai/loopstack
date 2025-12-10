import {
  WorkflowTestBuilder,
  CreateDocument,
  createDocumentResultMock,
  SwitchTarget,
} from '@loopstack/core';
import { AiGenerateText, DelegateToolCall } from '@loopstack/llm';
import { ToolCallWorkflow } from '../tool-call.workflow';
import { createTestingModule } from '../../../../../test/create-testing-module';
import { AiMessageDocument } from '@loopstack/core/dist/core-tools/documents/ai-message-document';

describe('ToolCallWorkflow', () => {
  it('should execute workflow with tool call and return to ready state', async () => {
    const mockUserMessage = {
      role: 'user',
      parts: [{
        type: 'text',
        text: 'How is the weather in Berlin?',
      }],
    };

    const mockLlmResponseWithToolCall = {
      role: 'assistant',
      parts: [{
        type: 'tool-GetWeather',
        toolCallId: 'tool_call_1',
        input: { location: 'Berlin' },
        state: "input-available",
      }],
    };

    const mockToolCallResult = {
      parts: [{
        type: 'tool-GetWeather',
        toolCallId: 'tool_call_1',
        input: { location: 'Berlin' },
        state: 'output-available',
        output: {
          type: 'text',
          value: 'Weather in Berlin: 15°C, partly cloudy',
        },
      }],
    };

    const mockFinalLlmResponse = {
      role: 'assistant',
      parts: [{
        type: 'text',
        text: 'The weather in Berlin is currently 15°C and partly cloudy.',
      }],
    };

    const builder = new WorkflowTestBuilder(createTestingModule, ToolCallWorkflow)
      .withToolMock(CreateDocument, [
        createDocumentResultMock(AiMessageDocument, mockUserMessage),
        createDocumentResultMock(AiMessageDocument, mockLlmResponseWithToolCall),
        createDocumentResultMock(AiMessageDocument, mockToolCallResult),
        createDocumentResultMock(AiMessageDocument, mockFinalLlmResponse),
      ])
      .withToolMock(AiGenerateText, [
        { data: mockLlmResponseWithToolCall },
        { data: mockFinalLlmResponse },
      ])
      .withToolMock(DelegateToolCall, [
        { data: mockToolCallResult },
        { data: { parts: [] } }, // No more tool calls on second iteration
      ])
      .withToolMock(SwitchTarget, [
        {
          effects: {
            setTransitionPlace: 'tool_response',
          },
        },
        {
          effects: {
            setTransitionPlace: 'end',
          },
        }
      ]);

    await builder.runWorkflow((workflow, test) => {
      // Should execute without errors and reach end state
      expect(workflow).toBeDefined();
      expect(workflow.state.place).toBe('end');
      expect(workflow.state.stop).toBe(false);
      expect(workflow.state.error).toBe(false);

      // Should call AiGenerateText twice (initial + after tool response)
      expect(test.getToolSpy(AiGenerateText)).toHaveBeenCalledTimes(2);
      expect(test.getToolSpy(AiGenerateText)).toHaveBeenCalledWith(
        expect.objectContaining({
          llm: {
            provider: 'openai',
            model: 'gpt-4o',
          },
          messagesSearchTag: 'message',
          tools: ['GetWeather'],
        }),
        expect.anything(),
        expect.anything()
      );

      // Should call DelegateToolCall twice
      expect(test.getToolSpy(DelegateToolCall)).toHaveBeenCalledTimes(2);

      // DelegateToolCall got called with tool call message
      expect(test.getToolSpy(DelegateToolCall)).toHaveBeenCalledWith(
        expect.objectContaining({
          message: mockLlmResponseWithToolCall,
        }),
        expect.anything(),
        expect.anything()
      );

      // DelegateToolCall got called with final llm message with no tool calls
      expect(test.getToolSpy(DelegateToolCall)).toHaveBeenCalledWith(
        expect.objectContaining({
          message: mockFinalLlmResponse,
        }),
        expect.anything(),
        expect.anything()
      );

      // Should call SwitchTarget twice for routing
      expect(test.getToolSpy(SwitchTarget)).toHaveBeenCalledTimes(2);

      // Should have correct llmResponse and toolCallResult properties
      expect(workflow.llmResponse).toEqual(mockFinalLlmResponse);

      // Check workflow history
      expect(workflow.state.history).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ transition: 'invalidation', from: 'start', to: 'start' }),
          expect.objectContaining({ transition: 'greeting', from: 'start', to: 'ready' }),
          expect.objectContaining({ transition: 'llm_turn', from: 'ready', to: 'prompt_executed' }),
          expect.objectContaining({ transition: 'delegate_tools', from: 'prompt_executed', to: 'tool_calls_processed' }),
          expect.objectContaining({ transition: 'route_next', from: 'tool_calls_processed', to: 'tool_response' }),
          expect.objectContaining({ transition: 'add_tool_response_message', from: 'tool_response', to: 'ready' }),
          expect.objectContaining({ transition: 'llm_turn', from: 'ready', to: 'prompt_executed' }),
          expect.objectContaining({ transition: 'delegate_tools', from: 'prompt_executed', to: 'tool_calls_processed' }),
          expect.objectContaining({ transition: 'route_next', from: 'tool_calls_processed', to: 'end' }),
        ])
      );
    });

    await builder.teardown();
  });

  it('should go directly to end when no tool calls are needed', async () => {
    const mockUserMessage = {
      role: 'user',
      parts: [{
        type: 'text',
        text: 'How is the weather in Berlin?',
      }],
    };

    const mockLlmResponseNoToolCall = {
      role: 'assistant',
      parts: [{
        type: 'text',
        text: 'I cannot check the weather without access to weather tools.',
      }],
    };

    const builder = new WorkflowTestBuilder(createTestingModule, ToolCallWorkflow)
      .withToolMock(CreateDocument, [
        createDocumentResultMock(AiMessageDocument, mockUserMessage),
        createDocumentResultMock(AiMessageDocument, mockLlmResponseNoToolCall),
      ])
      .withToolMock(AiGenerateText, [{ data: mockLlmResponseNoToolCall }])
      .withToolMock(DelegateToolCall, [{ data: { parts: [] } }])
      .withToolMock(SwitchTarget, [
        {
          effects: {
            setTransitionPlace: 'end',
          },
        }
      ]);

    await builder.runWorkflow((workflow, test) => {
      // Should execute without errors and reach end state directly
      expect(workflow).toBeDefined();
      expect(workflow.state.place).toBe('end');
      expect(workflow.state.stop).toBe(false);
      expect(workflow.state.error).toBe(false);

      // Should call AiGenerateText once
      expect(test.getToolSpy(AiGenerateText)).toHaveBeenCalledTimes(1);

      // Should call DelegateToolCall once
      expect(test.getToolSpy(DelegateToolCall)).toHaveBeenCalledTimes(1);

      // Should call SwitchTarget once and route to end
      expect(test.getToolSpy(SwitchTarget)).toHaveBeenCalledTimes(1);

      // Should have correct llmResponse
      expect(workflow.llmResponse).toEqual(mockLlmResponseNoToolCall);

      // toolCallResult should have empty parts
      expect(workflow.toolCallResult).toEqual({ parts: [] });
    });

    await builder.teardown();
  });

  it('should handle multiple tool calls in a single LLM response', async () => {
    const mockUserMessage = {
      role: 'user',
      parts: [{
        type: 'text',
        text: 'How is the weather in Berlin and Munich?',
      }],
    };

    const mockLlmResponseWithMultipleToolCalls = {
      role: 'assistant',
      parts: [{
        type: 'tool-GetWeather',
        toolCallId: 'tool_call_1',
        input: { location: 'Berlin' },
        state: "input-available",
      }, {
        type: 'tool-GetWeather',
        toolCallId: 'tool_call_2',
        input: { location: 'Munich' },
        state: "input-available",
      }],
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
      parts: [{
        type: 'text',
        text: 'Berlin: 15°C partly cloudy. Munich: 18°C sunny.',
      }],
    };

    const builder = new WorkflowTestBuilder(createTestingModule, ToolCallWorkflow)
      .withToolMock(CreateDocument, [
        createDocumentResultMock(AiMessageDocument, mockUserMessage),
        createDocumentResultMock(AiMessageDocument, mockLlmResponseWithMultipleToolCalls),
        createDocumentResultMock(AiMessageDocument, mockToolCallResults),
        createDocumentResultMock(AiMessageDocument, mockFinalResponse),
      ])
      .withToolMock(AiGenerateText, [
        { data: mockLlmResponseWithMultipleToolCalls },
        { data: mockFinalResponse },
      ])
      .withToolMock(DelegateToolCall, [
        { data: mockToolCallResults },
        { data: { parts: [] } },
      ])
      .withToolMock(SwitchTarget, [
        {
          effects: {
            setTransitionPlace: 'tool_response',
          },
        },
        {
          effects: {
            setTransitionPlace: 'end',
          },
        }
      ]);

    await builder.runWorkflow((workflow, test) => {
      expect(workflow).toBeDefined();
      expect(workflow.state.place).toBe('end');
      expect(workflow.state.error).toBe(false);

      // DelegateToolCall should receive message with multiple tool calls
      expect(test.getToolSpy(DelegateToolCall)).toHaveBeenCalledWith(
        expect.objectContaining({
          message: mockLlmResponseWithMultipleToolCalls,
        }),
        expect.anything(),
        expect.anything()
      );

      expect(workflow.llmResponse).toEqual(mockFinalResponse);
    });

    await builder.teardown();
  });
});