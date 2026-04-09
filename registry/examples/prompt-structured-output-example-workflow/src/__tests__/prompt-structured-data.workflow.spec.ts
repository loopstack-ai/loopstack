import { TestingModule } from '@nestjs/testing';
import { ClaudeGenerateDocument, ClaudeModule } from '@loopstack/claude-module';
import { getBlockTools } from '@loopstack/common';
import { LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { ToolMock, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { FileDocument } from '../documents/file-document';
import { PromptStructuredOutputWorkflow } from '../prompt-structured-output.workflow';

describe('PromptStructuredOutputWorkflow', () => {
  let module: TestingModule;
  let workflow: PromptStructuredOutputWorkflow;
  let processor: WorkflowProcessorService;

  let mockClaudeGenerateDocument: ToolMock;

  const mockFileContent = {
    filename: 'hello_world.py',
    description: 'A simple Hello World script',
    code: 'print("Hello, World!")',
  };

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(PromptStructuredOutputWorkflow)
      .withImports(LoopCoreModule, ClaudeModule)
      .withProvider(FileDocument)
      .withToolOverride(ClaudeGenerateDocument)
      .compile();

    workflow = module.get(PromptStructuredOutputWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockClaudeGenerateDocument = module.get(ClaudeGenerateDocument);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('should be defined with correct tools', () => {
      expect(workflow).toBeDefined();
      expect(getBlockTools(workflow)).toContain('claudeGenerateDocument');
    });
  });

  describe('workflow execution', () => {
    const context = createStatelessContext();

    it('should execute workflow and generate hello world script', async () => {
      mockClaudeGenerateDocument.call.mockResolvedValue({
        data: { content: mockFileContent },
      });

      const result = await processor.process(workflow, { language: 'python' }, context);

      expect(result.hasError).toBe(false);

      // Verify ClaudeGenerateDocument was called once with correct arguments
      expect(mockClaudeGenerateDocument.call).toHaveBeenCalledTimes(1);
      expect(mockClaudeGenerateDocument.call).toHaveBeenCalledWith(
        expect.objectContaining({
          claude: {
            model: 'claude-sonnet-4-6',
          },
          prompt: expect.stringContaining('python'),
        }),
        undefined,
      );

      // Verify status document was created (greeting + respond both write to id 'status', last write wins)
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]).toEqual(
        expect.objectContaining({
          className: 'ClaudeMessageDocument',
          content: expect.objectContaining({
            role: 'assistant',
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'text',
                text: expect.stringContaining('Successfully generated'),
              }),
            ]),
          }),
        }),
      );
    });

    it('should work with different programming languages', async () => {
      mockClaudeGenerateDocument.call.mockResolvedValue({
        data: { content: { ...mockFileContent, filename: 'hello_world.js' } },
      });

      const result = await processor.process(workflow, { language: 'javascript' }, context);

      expect(result.hasError).toBe(false);

      // Verify ClaudeGenerateDocument prompt mentions javascript
      expect(mockClaudeGenerateDocument.call).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('javascript'),
        }),
        undefined,
      );

      // Verify status document was created
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]).toEqual(
        expect.objectContaining({
          className: 'ClaudeMessageDocument',
          content: expect.objectContaining({
            role: 'assistant',
          }),
        }),
      );
    });

    it('should use default language when not provided', async () => {
      mockClaudeGenerateDocument.call.mockResolvedValue({
        data: { content: mockFileContent },
      });

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);

      // Verify ClaudeGenerateDocument was called with default language "python"
      expect(mockClaudeGenerateDocument.call).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('python'),
        }),
        undefined,
      );
    });
  });
});
