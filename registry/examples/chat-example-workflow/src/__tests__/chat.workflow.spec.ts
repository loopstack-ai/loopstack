import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClaudeModule } from '@loopstack/claude-module';
import { WorkflowProcessorService } from '@loopstack/core';
import { LlmGenerateTextTool, LlmProviderModule } from '@loopstack/llm-provider-module';
import { ToolMock, createContext, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { ChatWorkflow } from '../chat.workflow';

describe('ChatWorkflow', () => {
  let module: TestingModule;
  let workflow: ChatWorkflow;
  let processor: WorkflowProcessorService;

  let mockLlmGenerateTextTool: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(ChatWorkflow)
      .withImports(LlmProviderModule.forRoot({}), ClaudeModule)
      .withToolOverride(LlmGenerateTextTool)
      .compile();

    workflow = module.get(ChatWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockLlmGenerateTextTool = module.get(LlmGenerateTextTool);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(workflow).toBeDefined();
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
          documentName: 'llm_message',
          content: expect.objectContaining({ role: 'user' }),
          meta: expect.objectContaining({ hidden: true }),
        }),
      );

      // LLM should not be called yet (waiting for user message)
      expect(mockLlmGenerateTextTool.call).not.toHaveBeenCalled();
    });
  });

  describe('resume from waiting_for_user', () => {
    it('should process user message and generate LLM response', async () => {
      const workflowId = '00000000-0000-0000-0000-000000000001';

      mockLlmGenerateTextTool.call.mockResolvedValue({
        data: {
          message: {
            id: 'msg_1',
            role: 'assistant',
            content: [{ type: 'text', text: 'I am doing well, thank you!' }],
            stopReason: 'end_turn',
          },
        },
        metadata: {
          provider: 'claude',
          model: 'claude-sonnet-4-6',
        },
      });

      const context = createContext({
        workflowEntity: {
          id: workflowId,
          place: 'waiting_for_user',
          documents: [],
        },
        payload: {
          transition: {
            id: 'userMessage',
            workflowId,
            payload: 'Hello, how are you?',
          },
        },
      });

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(true);
      expect(result.place).toBe('waiting_for_user');

      // LLM should have been called with correct arguments
      expect(mockLlmGenerateTextTool.call).toHaveBeenCalledTimes(1);
      expect(mockLlmGenerateTextTool.call).toHaveBeenCalledWith(
        {},
        { config: { model: 'claude-sonnet-4-6', provider: 'claude' } },
      );

      // User message and LLM response should be saved as documents
      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            documentName: 'llm_message',
            content: expect.objectContaining({ role: 'user', content: 'Hello, how are you?' }),
          }),
          expect.objectContaining({
            documentName: 'llm_message',
            content: expect.objectContaining({ role: 'assistant' }),
          }),
        ]),
      );
    });
  });
});
