import { TestingModule } from '@nestjs/testing';
import { PromptStructuredOutputWorkflow } from '../prompt-structured-output.workflow';
import {
  BlockExecutionContextDto,
  LoopCoreModule,
  WorkflowProcessorService,
} from '@loopstack/core';
import { CoreUiModule, CreateDocument } from '@loopstack/core-ui-module';
import { AiModule, AiGenerateDocument } from '@loopstack/ai-module';
import { FileDocument } from '../documents/file-document';
import { createWorkflowTest, ToolMock } from '@loopstack/testing';

describe('PromptStructuredOutputWorkflow', () => {
  let module: TestingModule;
  let workflow: PromptStructuredOutputWorkflow;
  let processor: WorkflowProcessorService;

  let mockCreateDocument: ToolMock;
  let mockAiGenerateDocument: ToolMock;

  const mockFileContent = {
    filename: 'hello_world.py',
    description: 'A simple Hello World script',
    code: 'print("Hello, World!")',
  };

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(PromptStructuredOutputWorkflow)
      .withImports(LoopCoreModule, CoreUiModule, AiModule)
      .withProvider(FileDocument)
      .withToolOverride(CreateDocument)
      .withToolOverride(AiGenerateDocument)
      .compile();

    workflow = module.get(PromptStructuredOutputWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockCreateDocument = module.get(CreateDocument);
    mockAiGenerateDocument = module.get(AiGenerateDocument);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('should be defined with correct tools and documents', () => {
      expect(workflow).toBeDefined();
      expect(workflow.tools).toContain('createDocument');
      expect(workflow.tools).toContain('aiGenerateDocument');
    });

    it('should apply default argument value', () => {
      const result = workflow.validate({});
      expect(result).toEqual({ language: 'python' });
    });
  });

  describe('workflow execution', () => {
    const context = new BlockExecutionContextDto({});

    it('should execute workflow and generate hello world script', async () => {
      mockCreateDocument.execute.mockResolvedValue({});
      mockAiGenerateDocument.execute.mockResolvedValue({
        data: { content: mockFileContent },
      });

      const result = await processor.process(workflow, { language: 'python' }, context);

      expect(result.runtime.error).toBe(false);

      // Verify CreateDocument was called twice (status message + success message)
      expect(mockCreateDocument.execute).toHaveBeenCalledTimes(2);

      // First call: status message
      expect(mockCreateDocument.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'status',
          update: {
            content: {
              role: 'assistant',
              parts: [{
                type: 'text',
                text: "Creating a 'Hello, World!' script in python...",
              }],
            },
          },
        }),
        expect.anything(),
        expect.anything(),
      );

      // Verify AiGenerateDocument was called once with correct arguments
      expect(mockAiGenerateDocument.execute).toHaveBeenCalledTimes(1);
      expect(mockAiGenerateDocument.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          llm: {
            provider: 'openai',
            model: 'gpt-4o',
          },
          prompt: expect.stringContaining('python'),
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

    it('should work with different programming languages', async () => {
      mockCreateDocument.execute.mockResolvedValue({});
      mockAiGenerateDocument.execute.mockResolvedValue({
        data: { content: { ...mockFileContent, filename: 'hello_world.js' } },
      });

      const result = await processor.process(workflow, { language: 'javascript' }, context);

      expect(result.runtime.error).toBe(false);

      // Verify status message mentions javascript
      expect(mockCreateDocument.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {
            content: {
              role: 'assistant',
              parts: [{
                type: 'text',
                text: "Creating a 'Hello, World!' script in javascript...",
              }],
            },
          },
        }),
        expect.anything(),
        expect.anything(),
      );

      // Verify AiGenerateDocument prompt mentions javascript
      expect(mockAiGenerateDocument.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('javascript'),
        }),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should use default language when not provided', async () => {
      mockCreateDocument.execute.mockResolvedValue({});
      mockAiGenerateDocument.execute.mockResolvedValue({
        data: { content: mockFileContent },
      });

      const result = await processor.process(workflow, {}, context);

      expect(result.runtime.error).toBe(false);

      // Verify AiGenerateDocument was called with default language "python"
      expect(mockAiGenerateDocument.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('python'),
        }),
        expect.anything(),
        expect.anything(),
      );
    });
  });
});