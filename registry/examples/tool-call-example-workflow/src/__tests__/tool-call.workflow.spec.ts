import { TestingModule } from '@nestjs/testing';
import { ClaudeModule } from '@loopstack/claude-module';
import { getBlockTools } from '@loopstack/common';
import { LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { LlmDelegateToolCallsTool, LlmGenerateTextTool } from '@loopstack/llm-provider-module';
import { ToolMock, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { ToolCallWorkflow } from '../tool-call.workflow';
import { GetWeather } from '../tools/get-weather.tool';

describe('ToolCallWorkflow', () => {
  let module: TestingModule;
  let workflow: ToolCallWorkflow;
  let processor: WorkflowProcessorService;
  let mockLlmGenerateText: ToolMock;
  let mockLlmDelegateToolCalls: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(ToolCallWorkflow)
      .withImports(LoopCoreModule, ClaudeModule)
      .withToolOverride(LlmGenerateTextTool)
      .withToolOverride(LlmDelegateToolCallsTool)
      .withProviders(GetWeather)
      .compile();

    workflow = module.get(ToolCallWorkflow);
    processor = module.get(WorkflowProcessorService);
    mockLlmGenerateText = module.get(LlmGenerateTextTool);
    mockLlmDelegateToolCalls = module.get(LlmDelegateToolCallsTool);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(workflow).toBeDefined();
    expect(getBlockTools(workflow)).toContain('llmGenerateText');
    expect(getBlockTools(workflow)).toContain('llmDelegateToolCalls');
    expect(getBlockTools(workflow)).toContain('getWeather');
  });

  it('should execute workflow with tool call and loop back to ready state', async () => {
    const mockToolUseResponse = {
      data: {
        message: {
          id: 'msg_1',
          role: 'assistant',
          content: [{ type: 'tool_call', id: 'tool_call_1', name: 'getWeather', args: { location: 'Berlin' } }],
          stopReason: 'tool_use',
        },
      },
      metadata: { provider: 'claude', model: 'claude-sonnet-4-6' },
    };

    const mockToolCallResult = {
      data: {
        allCompleted: true,
        toolResults: [
          { type: 'tool_result', toolCallId: 'tool_call_1', content: 'Weather in Berlin: 15°C, partly cloudy' },
        ],
        message: mockToolUseResponse.data.message,
        pendingCount: 0,
        errorCount: 0,
        hasErrors: false,
        errors: [],
      },
    };

    const mockFinalResponse = {
      data: {
        message: {
          id: 'msg_2',
          role: 'assistant',
          content: [{ type: 'text', text: 'The weather in Berlin is currently 15°C and partly cloudy.' }],
          stopReason: 'end_turn',
        },
      },
      metadata: { provider: 'claude', model: 'claude-sonnet-4-6' },
    };

    mockLlmGenerateText.call.mockResolvedValueOnce(mockToolUseResponse).mockResolvedValueOnce(mockFinalResponse);
    mockLlmDelegateToolCalls.call.mockResolvedValue(mockToolCallResult);

    const context = createStatelessContext();
    const result = await processor.process(workflow, {}, context);

    expect(result.hasError).toBe(false);
    expect(result.place).toBe('end');
    expect(mockLlmGenerateText.call).toHaveBeenCalledTimes(2);
    expect(mockLlmDelegateToolCalls.call).toHaveBeenCalledTimes(1);
  });

  it('should go directly to end when no tool calls in response', async () => {
    const mockNoToolCallResponse = {
      data: {
        message: {
          id: 'msg_1',
          role: 'assistant',
          content: [{ type: 'text', text: 'I cannot check the weather without a tool.' }],
          stopReason: 'end_turn',
        },
      },
      metadata: { provider: 'claude', model: 'claude-sonnet-4-6' },
    };

    mockLlmGenerateText.call.mockResolvedValue(mockNoToolCallResponse);

    const context = createStatelessContext();
    const result = await processor.process(workflow, {}, context);

    expect(result.hasError).toBe(false);
    expect(result.place).toBe('end');
    expect(mockLlmGenerateText.call).toHaveBeenCalledTimes(1);
    expect(mockLlmDelegateToolCalls.call).not.toHaveBeenCalled();
  });
});
