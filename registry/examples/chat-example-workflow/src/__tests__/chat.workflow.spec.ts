import { TestingModule } from '@nestjs/testing';
import { ClaudeGenerateText, ClaudeModule } from '@loopstack/claude-module';
import { RunContext, generateObjectFingerprint, getBlockTools } from '@loopstack/common';
import { CreateDocument, LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { ToolMock, createWorkflowTest } from '@loopstack/testing';
import { ChatWorkflow } from '../chat.workflow';

describe('ChatWorkflow', () => {
  let module: TestingModule;
  let workflow: ChatWorkflow;
  let processor: WorkflowProcessorService;

  let mockCreateDocument: ToolMock;
  let mockClaudeGenerateText: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(ChatWorkflow)
      .withImports(LoopCoreModule, ClaudeModule)
      .withToolOverride(CreateDocument)
      .withToolOverride(ClaudeGenerateText)
      .compile();

    workflow = module.get(ChatWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockCreateDocument = module.get(CreateDocument);
    mockClaudeGenerateText = module.get(ClaudeGenerateText);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('should be defined with correct tools', () => {
      expect(workflow).toBeDefined();
      expect(getBlockTools(workflow)).toContain('createDocument');
      expect(getBlockTools(workflow)).toContain('claudeGenerateText');
    });
  });

  describe('initial workflow execution', () => {
    const context = {} as RunContext;

    it('should execute setup and stop at waiting_for_user', async () => {
      mockCreateDocument.run.mockResolvedValue({});

      const result = await processor.process(workflow, {}, context);

      // Should execute without errors and stop at waiting_for_user
      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(true);
      expect(result.place).toBe('waiting_for_user');

      // Setup creates one hidden system document
      expect(mockCreateDocument.run).toHaveBeenCalledTimes(1);
      expect(mockCreateDocument.run).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            meta: { hidden: true },
            content: expect.objectContaining({ role: 'user' }),
          }),
        }),
      );

      // LLM should not be called yet (waiting for user message)
      expect(mockClaudeGenerateText.run).not.toHaveBeenCalled();
    });
  });

  describe('workflow with user input', () => {
    it('should execute workflow with user input until next manual step', async () => {
      const mockLlmResponse = {
        id: 'msg_1',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Hello! I am Bob.' }],
      };

      const previousRun = {
        workflowId: '123',
        args: {},
      };

      const moduleWithState = await createWorkflowTest()
        .forWorkflow(ChatWorkflow)
        .withImports(LoopCoreModule, ClaudeModule)
        .withToolOverride(CreateDocument)
        .withToolOverride(ClaudeGenerateText)
        .withExistingWorkflow({
          id: previousRun.workflowId,
          place: 'waiting_for_user',
          hashRecord: {
            options: generateObjectFingerprint(previousRun.args),
          },
        })
        .compile();

      const workflowWithState = moduleWithState.get(ChatWorkflow);
      const processorWithState = moduleWithState.get(WorkflowProcessorService);

      const mockCreateDocumentWithState: ToolMock = moduleWithState.get(CreateDocument);
      const mockClaudeGenerateTextWithState: ToolMock = moduleWithState.get(ClaudeGenerateText);

      mockCreateDocumentWithState.run.mockResolvedValue({});
      mockClaudeGenerateTextWithState.run.mockResolvedValue({ data: mockLlmResponse });

      const contextWithPayload = {
        payload: {
          transition: {
            workflowId: '123',
            id: 'user_message',
            payload: 'Hello Bob!',
          },
        },
      } as RunContext;

      const result = await processorWithState.process(workflowWithState, {}, contextWithPayload);

      expect(result.place).toBe('waiting_for_user');
      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(true);

      // user_message creates user doc, respond creates LLM response doc
      expect(mockCreateDocumentWithState.run).toHaveBeenCalledTimes(2);

      // First call: user message
      expect(mockCreateDocumentWithState.run).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          update: expect.objectContaining({
            content: expect.objectContaining({ role: 'user' }),
          }),
        }),
      );

      // Verify ClaudeGenerateText was called once with correct config
      expect(mockClaudeGenerateTextWithState.run).toHaveBeenCalledTimes(1);
      expect(mockClaudeGenerateTextWithState.run).toHaveBeenCalledWith(
        expect.objectContaining({
          claude: { model: 'claude-sonnet-4-6' },
          messagesSearchTag: 'message',
        }),
      );

      await moduleWithState.close();
    });
  });
});
