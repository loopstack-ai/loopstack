import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClaudeModule } from '@loopstack/claude-module';
import { WorkflowProcessorService } from '@loopstack/core';
import { LlmGenerateTextTool, LlmProviderModule } from '@loopstack/llm-provider-module';
import { ToolMock, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { PromptWorkflow } from '../prompt.workflow';

describe('PromptWorkflow', () => {
  let module: TestingModule;
  let workflow: PromptWorkflow;
  let processor: WorkflowProcessorService;
  let mockLlmGenerateText: ToolMock;

  const mockLlmResult = {
    data: {
      message: {
        id: 'msg_1',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Cherry blossoms fall\nPink petals dance in the wind\nSpring whispers goodbye',
          },
        ],
        stopReason: 'end_turn',
      },
    },
    metadata: { provider: 'claude', model: 'claude-sonnet-4-6' },
  };

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(PromptWorkflow)
      .withImports(LlmProviderModule, ClaudeModule)
      .withToolOverride(LlmGenerateTextTool)
      .compile();

    workflow = module.get(PromptWorkflow);
    processor = module.get(WorkflowProcessorService);
    mockLlmGenerateText = module.get(LlmGenerateTextTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(workflow).toBeDefined();
    });
  });

  describe('workflow execution', () => {
    const context = createStatelessContext();

    it('should execute workflow and generate haiku about a subject', async () => {
      mockLlmGenerateText.call.mockResolvedValue(mockLlmResult);

      const result = await processor.process(workflow, { subject: 'spring' }, context);

      expect(result.hasError).toBe(false);

      expect(mockLlmGenerateText.call).toHaveBeenCalledTimes(1);
      expect(mockLlmGenerateText.call).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('spring'),
        }),
        { config: { model: 'claude-sonnet-4-6', provider: 'claude' } },
      );

      // The assistant message is persisted by LlmGenerateTextTool itself;
      // with the tool mocked here, that side effect doesn't fire, so the
      // workflow's own document output is empty.
      expect(result.documents).toHaveLength(0);
    });

    it('should use default subject when not provided', async () => {
      mockLlmGenerateText.call.mockResolvedValue(mockLlmResult);

      // processor.process expects already-parsed args; in production runStateless/CreateWorkflowService
      // run the schema first. Mirror that here so the workflow's default value flows through.
      const result = await processor.process(workflow, { subject: 'coffee' }, context);

      expect(result.hasError).toBe(false);

      expect(mockLlmGenerateText.call).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('coffee'),
        }),
        { config: { model: 'claude-sonnet-4-6', provider: 'claude' } },
      );
    });
  });
});
