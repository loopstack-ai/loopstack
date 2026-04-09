import { TestingModule } from '@nestjs/testing';
import { ClaudeGenerateText, ClaudeModule } from '@loopstack/claude-module';
import { getBlockTools } from '@loopstack/common';
import { LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { ToolMock, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { PromptWorkflow } from '../prompt.workflow';

describe('PromptWorkflow', () => {
  let module: TestingModule;
  let workflow: PromptWorkflow;
  let processor: WorkflowProcessorService;

  let mockClaudeGenerateText: ToolMock;

  const mockLlmResponse = {
    id: 'msg_1',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'Cherry blossoms fall\nPink petals dance in the wind\nSpring whispers goodbye',
      },
    ],
  };

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(PromptWorkflow)
      .withImports(LoopCoreModule, ClaudeModule)
      .withToolOverride(ClaudeGenerateText)
      .compile();

    workflow = module.get(PromptWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockClaudeGenerateText = module.get(ClaudeGenerateText);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('should be defined with correct tools', () => {
      expect(workflow).toBeDefined();
      expect(getBlockTools(workflow)).toContain('claudeGenerateText');
    });
  });

  describe('workflow execution', () => {
    const context = createStatelessContext();

    it('should execute workflow and generate haiku about a subject', async () => {
      mockClaudeGenerateText.call.mockResolvedValue({ data: mockLlmResponse });

      const result = await processor.process(workflow, { subject: 'spring' }, context);

      expect(result.hasError).toBe(false);

      // Verify ClaudeGenerateText was called with correct arguments
      expect(mockClaudeGenerateText.call).toHaveBeenCalledTimes(1);
      expect(mockClaudeGenerateText.call).toHaveBeenCalledWith(
        expect.objectContaining({
          claude: {
            model: 'claude-sonnet-4-6',
          },
          prompt: expect.stringContaining('Write a haiku about spring'),
        }),
        undefined,
      );

      // Verify LLM response was saved as a document
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]).toEqual(
        expect.objectContaining({
          className: 'ClaudeMessageDocument',
          content: expect.objectContaining({ role: 'assistant' }),
        }),
      );
    });

    it('should use default subject when not provided', async () => {
      mockClaudeGenerateText.call.mockResolvedValue({ data: mockLlmResponse });

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);

      // Verify ClaudeGenerateText was called with default subject "coffee"
      expect(mockClaudeGenerateText.call).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Write a haiku about coffee'),
        }),
        undefined,
      );
    });
  });
});
