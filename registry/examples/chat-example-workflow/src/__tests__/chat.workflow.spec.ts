import { TestingModule } from '@nestjs/testing';
import { ClaudeGenerateText, ClaudeModule } from '@loopstack/claude-module';
import { RunContext, WorkflowEntity, getBlockTools } from '@loopstack/common';
import { LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { ToolMock, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { ChatWorkflow } from '../chat.workflow';

describe('ChatWorkflow', () => {
  let module: TestingModule;
  let workflow: ChatWorkflow;
  let processor: WorkflowProcessorService;

  let mockClaudeGenerateText: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(ChatWorkflow)
      .withImports(LoopCoreModule, ClaudeModule)
      .withToolOverride(ClaudeGenerateText)
      .compile();

    workflow = module.get(ChatWorkflow);
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

  describe('initial workflow execution', () => {
    it('should execute setup and stop at waiting_for_user', async () => {
      const context = createStatelessContext();

      const result = await processor.process(workflow, {}, context);

      // Should execute without errors and stop at waiting_for_user
      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(true);
      expect(result.place).toBe('waiting_for_user');

      // Setup creates one hidden system document
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]).toEqual(
        expect.objectContaining({
          className: 'ClaudeMessageDocument',
          content: expect.objectContaining({ role: 'user' }),
          meta: expect.objectContaining({ hidden: true }),
        }),
      );

      // LLM should not be called yet (waiting for user message)
      expect(mockClaudeGenerateText.call).not.toHaveBeenCalled();
    });
  });

  describe('resume from waiting_for_user', () => {
    it('should process user message and generate LLM response', async () => {
      const workflowId = '00000000-0000-0000-0000-000000000001';

      mockClaudeGenerateText.call.mockResolvedValue({
        data: {
          id: 'msg_1',
          role: 'assistant',
          content: 'I am doing well, thank you!',
        },
      });

      const context = {
        workflowEntity: {
          id: workflowId,
          place: 'waiting_for_user',
          documents: [],
        } as Partial<WorkflowEntity>,
        payload: {
          transition: {
            id: 'userMessage',
            workflowId,
            payload: 'Hello, how are you?',
          },
        },
      } as RunContext;

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(true);
      expect(result.place).toBe('waiting_for_user');

      // LLM should have been called with correct arguments
      expect(mockClaudeGenerateText.call).toHaveBeenCalledTimes(1);
      expect(mockClaudeGenerateText.call).toHaveBeenCalledWith(
        expect.objectContaining({
          claude: { model: 'claude-sonnet-4-6' },
          messagesSearchTag: 'message',
        }),
        undefined,
      );

      // User message and LLM response should be saved as documents
      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            className: 'ClaudeMessageDocument',
            content: expect.objectContaining({ role: 'user', content: 'Hello, how are you?' }),
          }),
          expect.objectContaining({
            className: 'ClaudeMessageDocument',
            content: expect.objectContaining({ role: 'assistant' }),
          }),
        ]),
      );
    });
  });
});
