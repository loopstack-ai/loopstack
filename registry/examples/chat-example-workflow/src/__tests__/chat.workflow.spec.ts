import { TestingModule } from '@nestjs/testing';
import { AiGenerateText, AiModule } from '@loopstack/ai-module';
import { RunContext, generateObjectFingerprint, getBlockTools } from '@loopstack/common';
import { WorkflowProcessorService } from '@loopstack/core';
import { CoreUiModule, CreateDocument } from '@loopstack/core-ui-module';
import { ToolMock, createWorkflowTest } from '@loopstack/testing';
import { ChatWorkflow } from '../chat.workflow';

describe('ChatWorkflow', () => {
  let module: TestingModule;
  let workflow: ChatWorkflow;
  let processor: WorkflowProcessorService;

  let mockCreateDocument: ToolMock;
  let mockAiGenerateText: ToolMock;

  const _mockSystemPrompt = {
    role: 'system',
    parts: [
      {
        type: 'text',
        text: expect.stringContaining('Bob'),
      },
    ],
  };

  const mockLlmResponse = {
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: 'the initial prompt response',
      },
    ],
  };

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(ChatWorkflow)
      .withImports(CoreUiModule, AiModule)
      .withToolOverride(CreateDocument)
      .withToolOverride(AiGenerateText)
      .compile();

    workflow = module.get(ChatWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockCreateDocument = module.get(CreateDocument);
    mockAiGenerateText = module.get(AiGenerateText);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('should be defined with correct tools', () => {
      expect(workflow).toBeDefined();
      expect(getBlockTools(workflow)).toContain('createDocument');
      expect(getBlockTools(workflow)).toContain('aiGenerateText');
    });
  });

  describe('initial workflow execution', () => {
    const context = {} as RunContext;

    it('should execute workflow initial part until manual step', async () => {
      mockCreateDocument.execute.mockResolvedValue({});
      mockAiGenerateText.execute.mockResolvedValue({ data: mockLlmResponse });

      const result = await processor.process(workflow, {}, context);

      // Should execute without errors and stop at waiting_for_user (before manual step)
      expect(result.error).toBe(false);
      expect(result.stop).toBe(true);

      // Verify CreateDocument was called twice (system message + llm response)
      expect(mockCreateDocument.execute).toHaveBeenCalledTimes(2);

      // First call: system prompt (hidden)
      expect(mockCreateDocument.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            meta: {
              hidden: true,
            },
            content: expect.objectContaining({ role: 'system' }),
          }),
        }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );

      // Second call: LLM response
      expect(mockCreateDocument.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {
            content: mockLlmResponse,
          },
        }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );

      // Verify AiGenerateText was called once
      expect(mockAiGenerateText.execute).toHaveBeenCalledTimes(1);
      expect(mockAiGenerateText.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          llm: {
            provider: 'openai',
            model: 'gpt-4o',
          },
          messagesSearchTag: 'message',
        }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );

      // // Verify history contains expected places
      // const history = result.state.getHistory();
      // const places = history.map((h) => h.metadata?.place);
      // expect(places).toContain('ready');
      // expect(places).toContain('prompt_executed');
      // expect(places).toContain('waiting_for_user');
    });
  });

  describe('workflow with user input', () => {
    it('should execute workflow with user input until next manual step', async () => {
      const mockLlmResponse2 = {
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'the second prompt response',
          },
        ],
      };

      const previousRun = {
        workflowId: '123',
        args: {},
      };

      // Create module with existing workflow state
      const moduleWithState = await createWorkflowTest()
        .forWorkflow(ChatWorkflow)
        .withImports(CoreUiModule, AiModule)
        .withToolOverride(CreateDocument)
        .withToolOverride(AiGenerateText)
        .withExistingWorkflow({
          id: previousRun.workflowId,
          place: 'waiting_for_user',
          hashRecord: {
            options: generateObjectFingerprint(previousRun.args), // previously run with same arguments
          },
        })
        .compile();

      const workflowWithState = moduleWithState.get(ChatWorkflow);
      const processorWithState = moduleWithState.get(WorkflowProcessorService);

      const mockCreateDocumentWithState: ToolMock = moduleWithState.get(CreateDocument);
      const mockAiGenerateTextWithState: ToolMock = moduleWithState.get(AiGenerateText);

      mockCreateDocumentWithState.execute.mockResolvedValue({});
      mockAiGenerateTextWithState.execute.mockResolvedValue({ data: mockLlmResponse2 });

      // Context with user payload for manual transition
      const contextWithPayload = {
        payload: {
          transition: {
            workflowId: '123',
            id: 'user_message',
            payload: 'the user input message',
          },
        },
      } as RunContext;

      const result = await processorWithState.process(
        workflowWithState,
        {}, // same args as previous run, so workflow does not get invalidated
        contextWithPayload,
      );

      // Should execute without errors and stop at waiting_for_user again
      expect(result.place).toBe('waiting_for_user');
      expect(result.error).toBe(false);
      expect(result.stop).toBe(true);

      // Verify CreateDocument was called twice (user message + llm response 2)
      expect(mockCreateDocumentWithState.execute).toHaveBeenCalledTimes(2);

      // First call: user message
      expect(mockCreateDocumentWithState.execute).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          update: expect.objectContaining({
            content: expect.objectContaining({ role: 'user' }),
          }),
        }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );

      // Second call: LLM response
      expect(mockCreateDocumentWithState.execute).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          update: {
            content: mockLlmResponse2,
          },
        }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );

      // Verify AiGenerateText was called once
      expect(mockAiGenerateTextWithState.execute).toHaveBeenCalledTimes(1);
      expect(mockAiGenerateTextWithState.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          llm: {
            provider: 'openai',
            model: 'gpt-4o',
          },
          messagesSearchTag: 'message',
        }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );

      // Verify history contains expected places for full flow
      // const history = result.state.getHistory();
      // expect(history[0].metadata.transition?.from).toBe('waiting_for_user');
      // const places = history.map((h) => h.metadata?.place);
      // expect(places).toStrictEqual(['ready', 'prompt_executed', 'waiting_for_user']);

      await moduleWithState.close();
    });
  });
});
