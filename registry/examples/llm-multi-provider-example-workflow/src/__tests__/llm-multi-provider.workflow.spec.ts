import { TestingModule } from '@nestjs/testing';
import { ClaudeModule } from '@loopstack/claude-module';
import { getBlockTools } from '@loopstack/common';
import { LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { LlmGenerateTextTool } from '@loopstack/llm-provider-module';
import { OpenAiModule } from '@loopstack/openai-module';
import { ToolMock, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { LlmMultiProviderWorkflow } from '../llm-multi-provider.workflow';

const mockLlmResponse = (text: string) => ({
  data: {
    message: {
      id: 'msg_1',
      content: [{ type: 'text', text }],
      stopReason: 'end_turn',
    },
  },
});

describe('LlmMultiProviderWorkflow', () => {
  let module: TestingModule;
  let workflow: LlmMultiProviderWorkflow;
  let processor: WorkflowProcessorService;
  let mockLlm: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(LlmMultiProviderWorkflow)
      .withImports(LoopCoreModule, ClaudeModule, OpenAiModule)
      .withToolOverride(LlmGenerateTextTool)
      .compile();

    workflow = module.get(LlmMultiProviderWorkflow);
    processor = module.get(WorkflowProcessorService);
    mockLlm = module.get(LlmGenerateTextTool);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined with two LLM tool injections', () => {
    expect(workflow).toBeDefined();
    expect(getBlockTools(workflow)).toContain('claudeLlm');
    expect(getBlockTools(workflow)).toContain('openaiLlm');
  });

  it('should execute both providers and save response documents', async () => {
    mockLlm.call
      .mockResolvedValueOnce(mockLlmResponse('Claude says: 42.'))
      .mockResolvedValueOnce(mockLlmResponse('OpenAI says: To find purpose.'));

    const context = createStatelessContext();
    const result = await processor.process(workflow, { prompt: 'What is the meaning of life?' }, context);

    expect(result.hasError).toBe(false);
    expect(result.place).toBe('end');

    // LLM tool should have been called twice (once for each provider)
    expect(mockLlm.call).toHaveBeenCalledTimes(2);

    // Should have 3 documents: user prompt + 2 assistant responses
    expect(result.documents).toHaveLength(3);

    // User message
    expect(result.documents[0]).toEqual(
      expect.objectContaining({
        className: 'LlmMessageDocument',
        content: expect.objectContaining({
          role: 'user',
          content: 'What is the meaning of life?',
        }),
      }),
    );

    // Claude response
    expect(result.documents[1]).toEqual(
      expect.objectContaining({
        className: 'LlmMessageDocument',
        content: expect.objectContaining({
          role: 'assistant',
          content: expect.stringContaining('Claude'),
        }),
      }),
    );

    // OpenAI response
    expect(result.documents[2]).toEqual(
      expect.objectContaining({
        className: 'LlmMessageDocument',
        content: expect.objectContaining({
          role: 'assistant',
          content: expect.stringContaining('OpenAI'),
        }),
      }),
    );
  });

  it('should use default prompt when not provided', async () => {
    mockLlm.call
      .mockResolvedValueOnce(mockLlmResponse('Response 1'))
      .mockResolvedValueOnce(mockLlmResponse('Response 2'));

    const context = createStatelessContext();
    const result = await processor.process(workflow, {}, context);

    expect(result.hasError).toBe(false);
    expect(result.place).toBe('end');

    // First call should use the default prompt
    expect(mockLlm.call).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('meaning of life'),
      }),
      expect.objectContaining({
        config: expect.objectContaining({ provider: 'claude' }),
      }),
    );
  });
});
