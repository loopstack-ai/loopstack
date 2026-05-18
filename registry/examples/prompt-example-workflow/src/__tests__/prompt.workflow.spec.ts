import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClaudeModule } from '@loopstack/claude-module';
import { getBlockTools } from '@loopstack/common';
import { WorkflowProcessorService } from '@loopstack/core';
import { LlmGenerateTextTool } from '@loopstack/llm-provider-module';
import { ToolMock, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { PromptWorkflow } from '../prompt.workflow.js';

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
      .withImports(ClaudeModule)
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
    it('should be defined with correct tools', () => {
      expect(workflow).toBeDefined();
      expect(getBlockTools(workflow)).toContain('llmGenerateText');
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

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]).toEqual(
        expect.objectContaining({
          className: 'LlmMessageDocument',
          content: expect.objectContaining({ role: 'assistant' }),
        }),
      );
    });

    it('should use default subject when not provided', async () => {
      mockLlmGenerateText.call.mockResolvedValue(mockLlmResult);

      const result = await processor.process(workflow, {}, context);

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
