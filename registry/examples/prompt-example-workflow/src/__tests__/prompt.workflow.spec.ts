import { TestingModule } from '@nestjs/testing';
import { PromptWorkflow } from '../prompt.workflow';
import {
  BlockExecutionContextDto,
  createWorkflowTest,
  LoopCoreModule,
  ToolMock,
  WorkflowProcessorService,
} from '@loopstack/core';
import { CoreUiModule, CreateDocument } from '@loopstack/core-ui-module';
import { AiModule, AiGenerateText } from '@loopstack/ai-module';

describe('PromptWorkflow', () => {
  let module: TestingModule;
  let workflow: PromptWorkflow;
  let processor: WorkflowProcessorService;

  let mockAiGenerateText: ToolMock;
  let mockCreateDocument: ToolMock;

  const mockLlmResponse = {
    role: 'assistant',
    parts: [{
      type: 'text',
      text: 'Cherry blossoms fall\nPink petals dance in the wind\nSpring whispers goodbye',
    }],
  };

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(PromptWorkflow)
      .withImports(LoopCoreModule, CoreUiModule, AiModule)
      .withToolOverride(AiGenerateText)
      .withToolOverride(CreateDocument)
      .compile();

    workflow = module.get(PromptWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockAiGenerateText = module.get(AiGenerateText);
    mockCreateDocument = module.get(CreateDocument);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('should be defined with correct tools', () => {
      expect(workflow).toBeDefined();
      expect(workflow.tools).toContain('aiGenerateText');
      expect(workflow.tools).toContain('createDocument');
    });

    it('should apply default argument value', () => {
      const result = workflow.validate({});
      expect(result).toEqual({ subject: 'coffee' });
    });
  });

  describe('workflow execution', () => {
    const context = new BlockExecutionContextDto({});

    it('should execute workflow and generate haiku about a subject', async () => {
      mockAiGenerateText.execute.mockResolvedValue({ data: mockLlmResponse });
      mockCreateDocument.execute.mockResolvedValue({});

      const result = await processor.process(workflow, { subject: 'spring' }, context);

      expect(result.runtime.error).toBe(false);

      // Verify AiGenerateText was called with correct arguments
      expect(mockAiGenerateText.execute).toHaveBeenCalledTimes(1);
      expect(mockAiGenerateText.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          llm: {
            provider: 'openai',
            model: 'gpt-4o',
          },
          prompt: 'Write a haiku about spring',
        }),
        expect.anything(),
        expect.anything(),
      );

      // Verify CreateDocument was called with the LLM response
      expect(mockCreateDocument.execute).toHaveBeenCalledTimes(1);
      expect(mockCreateDocument.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {
            content: mockLlmResponse,
          },
        }),
        expect.anything(),
        expect.anything(),
      );

      // Verify history contains expected places
      const history = result.state.caretaker.getHistory();
      const places = history.map((h) => h.metadata?.place);
      expect(places).toContain('prompt_executed');
      expect(places).toContain('end');
    });

    it('should use default subject when not provided', async () => {
      mockAiGenerateText.execute.mockResolvedValue({ data: mockLlmResponse });
      mockCreateDocument.execute.mockResolvedValue({});

      const result = await processor.process(workflow, {}, context);

      expect(result.runtime.error).toBe(false);

      // Verify AiGenerateText was called with default subject "coffee"
      expect(mockAiGenerateText.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Write a haiku about coffee',
        }),
        expect.anything(),
        expect.anything(),
      );
    });
  });
});