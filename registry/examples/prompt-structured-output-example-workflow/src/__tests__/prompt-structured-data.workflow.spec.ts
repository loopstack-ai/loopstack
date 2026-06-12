import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClaudeModule } from '@loopstack/claude-module';
import { WorkflowProcessorService } from '@loopstack/core';
import { LlmGenerateObjectTool, LlmProviderModule } from '@loopstack/llm-provider-module';
import { ToolMock, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { FileDocument } from '../documents/file-document';
import { PromptStructuredOutputWorkflow } from '../prompt-structured-output.workflow';

describe('PromptStructuredOutputWorkflow', () => {
  let module: TestingModule;
  let workflow: PromptStructuredOutputWorkflow;
  let processor: WorkflowProcessorService;
  let mockLlmGenerateObject: ToolMock;

  const mockFileContent = {
    filename: 'hello_world.py',
    description: 'A simple Hello World script',
    code: 'print("Hello, World!")',
  };

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(PromptStructuredOutputWorkflow)
      .withImports(LlmProviderModule, ClaudeModule)
      .withProvider(FileDocument)
      .withToolOverride(LlmGenerateObjectTool)
      .compile();

    workflow = module.get(PromptStructuredOutputWorkflow);
    processor = module.get(WorkflowProcessorService);
    mockLlmGenerateObject = module.get(LlmGenerateObjectTool);
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

    it('should execute workflow and generate hello world script', async () => {
      mockLlmGenerateObject.call.mockResolvedValue({
        data: { data: mockFileContent },
      });

      const result = await processor.process(workflow, { language: 'python' }, context);

      expect(result.hasError).toBe(false);

      expect(mockLlmGenerateObject.call).toHaveBeenCalledTimes(1);
      expect(mockLlmGenerateObject.call).toHaveBeenCalledWith(
        expect.objectContaining({
          outputSchema: expect.any(Object),
          prompt: expect.stringContaining('python'),
        }),
        expect.objectContaining({
          config: expect.objectContaining({
            provider: 'claude',
          }),
        }),
      );

      expect(result.documents.length).toBeGreaterThanOrEqual(1);
      const statusDoc = result.documents.find((d) => d.documentName === 'llm_message');
      expect(statusDoc).toBeDefined();
      expect(statusDoc!.content).toEqual(
        expect.objectContaining({
          role: 'assistant',
          text: expect.stringContaining('Successfully generated'),
        }),
      );
    });

    it('should work with different programming languages', async () => {
      mockLlmGenerateObject.call.mockResolvedValue({
        data: { data: { ...mockFileContent, filename: 'hello_world.js' } },
      });

      const result = await processor.process(workflow, { language: 'javascript' }, context);

      expect(result.hasError).toBe(false);
      expect(mockLlmGenerateObject.call).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('javascript'),
        }),
        expect.objectContaining({
          config: expect.objectContaining({
            provider: 'claude',
          }),
        }),
      );
    });

    it('should use default language when not provided', async () => {
      mockLlmGenerateObject.call.mockResolvedValue({
        data: { data: mockFileContent },
      });

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);
      expect(mockLlmGenerateObject.call).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('python'),
        }),
        expect.objectContaining({
          config: expect.objectContaining({
            provider: 'claude',
          }),
        }),
      );
    });
  });
});
