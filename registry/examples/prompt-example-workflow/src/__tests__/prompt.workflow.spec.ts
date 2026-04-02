import { TestingModule } from '@nestjs/testing';
import { ClaudeGenerateText, ClaudeModule } from '@loopstack/claude-module';
import { RunContext, getBlockTools } from '@loopstack/common';
import { CreateDocument, LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { ToolMock, createWorkflowTest } from '@loopstack/testing';
import { PromptWorkflow } from '../prompt.workflow';

describe('PromptWorkflow', () => {
  let module: TestingModule;
  let workflow: PromptWorkflow;
  let processor: WorkflowProcessorService;

  let mockClaudeGenerateText: ToolMock;
  let mockCreateDocument: ToolMock;

  const mockLlmResponse = {
    role: 'assistant',
    parts: [
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
      .withToolOverride(CreateDocument)
      .compile();

    workflow = module.get(PromptWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockClaudeGenerateText = module.get(ClaudeGenerateText);
    mockCreateDocument = module.get(CreateDocument);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('should be defined with correct tools', () => {
      expect(workflow).toBeDefined();
      expect(getBlockTools(workflow)).toContain('claudeGenerateText');
      expect(getBlockTools(workflow)).toContain('createDocument');
    });
  });

  describe('workflow execution', () => {
    const context = {} as RunContext;

    it('should execute workflow and generate haiku about a subject', async () => {
      mockClaudeGenerateText.run.mockResolvedValue({ data: mockLlmResponse });
      mockCreateDocument.run.mockResolvedValue({});

      const result = await processor.process(workflow, { subject: 'spring' }, context);

      expect(result.hasError).toBe(false);

      // Verify ClaudeGenerateText was called with correct arguments
      expect(mockClaudeGenerateText.run).toHaveBeenCalledTimes(1);
      expect(mockClaudeGenerateText.run).toHaveBeenCalledWith(
        expect.objectContaining({
          claude: {
            model: 'claude-sonnet-4-6',
          },
          prompt: 'Write a haiku about spring',
        }),
      );

      // Verify CreateDocument was called with the LLM response
      expect(mockCreateDocument.run).toHaveBeenCalledTimes(1);
      expect(mockCreateDocument.run).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {
            content: mockLlmResponse,
          },
        }),
      );

      // // Verify history contains expected places
      // const history = result.state.getHistory();
      // const places = history.map((h) => h.metadata?.place);
      // expect(places).toContain('prompt_executed');
      // expect(places).toContain('end');
    });

    it('should use default subject when not provided', async () => {
      mockClaudeGenerateText.run.mockResolvedValue({ data: mockLlmResponse });
      mockCreateDocument.run.mockResolvedValue({});

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);

      // Verify ClaudeGenerateText was called with default subject "coffee"
      expect(mockClaudeGenerateText.run).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Write a haiku about coffee',
        }),
      );
    });
  });
});
