import { TestingModule } from '@nestjs/testing';
import { ClaudeGenerateDocument, ClaudeModule } from '@loopstack/claude-module';
import { RunContext, getBlockTools } from '@loopstack/common';
import { CreateDocument, LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { ToolMock, createWorkflowTest } from '@loopstack/testing';
import { FileDocument } from '../documents/file-document';
import { PromptStructuredOutputWorkflow } from '../prompt-structured-output.workflow';

describe('PromptStructuredOutputWorkflow', () => {
  let module: TestingModule;
  let workflow: PromptStructuredOutputWorkflow;
  let processor: WorkflowProcessorService;

  let mockCreateDocument: ToolMock;
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
      .withToolOverride(CreateDocument)
      .withToolOverride(ClaudeGenerateDocument)
      .compile();

    workflow = module.get(PromptStructuredOutputWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockCreateDocument = module.get(CreateDocument);
    mockClaudeGenerateDocument = module.get(ClaudeGenerateDocument);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('should be defined with correct tools and documents', () => {
      expect(workflow).toBeDefined();
      expect(getBlockTools(workflow)).toContain('createDocument');
      expect(getBlockTools(workflow)).toContain('claudeGenerateDocument');
    });
  });

  describe('workflow execution', () => {
    const context = {} as RunContext;

    it('should execute workflow and generate hello world script', async () => {
      mockCreateDocument.run.mockResolvedValue({});
      mockClaudeGenerateDocument.run.mockResolvedValue({
        data: { content: mockFileContent },
      });

      const result = await processor.process(workflow, { language: 'python' }, context);

      expect(result.hasError).toBe(false);

      // Verify CreateDocument was called twice (status message + success message)
      expect(mockCreateDocument.run).toHaveBeenCalledTimes(2);

      // First call: status message
      expect(mockCreateDocument.run).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'status',
          update: {
            content: {
              role: 'assistant',
              content: [
                {
                  type: 'text',
                  text: "Creating a 'Hello, World!' script in python...",
                },
              ],
            },
          },
        }),
      );

      // Verify ClaudeGenerateDocument was called once with correct arguments
      expect(mockClaudeGenerateDocument.run).toHaveBeenCalledTimes(1);
      expect(mockClaudeGenerateDocument.run).toHaveBeenCalledWith(
        expect.objectContaining({
          claude: {
            model: 'claude-sonnet-4-6',
          },
          prompt: expect.stringContaining('python'),
        }),
      );

      // // Verify history contains expected places
      // const history = result.state.getHistory();
      // const places = history.map((h) => h.metadata?.place);
      // expect(places).toContain('ready');
      // expect(places).toContain('prompt_executed');
      // expect(places).toContain('end');
    });

    it('should work with different programming languages', async () => {
      mockCreateDocument.run.mockResolvedValue({});
      mockClaudeGenerateDocument.run.mockResolvedValue({
        data: { content: { ...mockFileContent, filename: 'hello_world.js' } },
      });

      const result = await processor.process(workflow, { language: 'javascript' }, context);

      expect(result.hasError).toBe(false);

      // Verify status message mentions javascript
      expect(mockCreateDocument.run).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {
            content: {
              role: 'assistant',
              content: [
                {
                  type: 'text',
                  text: "Creating a 'Hello, World!' script in javascript...",
                },
              ],
            },
          },
        }),
      );

      // Verify ClaudeGenerateDocument prompt mentions javascript
      expect(mockClaudeGenerateDocument.run).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('javascript'),
        }),
      );
    });

    it('should use default language when not provided', async () => {
      mockCreateDocument.run.mockResolvedValue({});
      mockClaudeGenerateDocument.run.mockResolvedValue({
        data: { content: mockFileContent },
      });

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);

      // Verify ClaudeGenerateDocument was called with default language "python"
      expect(mockClaudeGenerateDocument.run).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('python'),
        }),
      );
    });
  });
});
