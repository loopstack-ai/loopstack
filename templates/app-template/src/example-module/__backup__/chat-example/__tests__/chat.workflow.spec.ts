import {
  WorkflowTestBuilder,
  getToolResult, CreateDocument, createDocumentResultMock,
} from '@loopstack/core';
import { AiGenerateText } from '@loopstack/llm';
import { ChatWorkflow } from '../chat.workflow';
import { createTestingModule } from '../../../../../test/create-testing-module';
import { AiMessageDocument } from '@loopstack/core/dist/core-tools/documents/ai-message-document';
import { DocumentEntity } from '@loopstack/common';

describe('ChatWorkflow', () => {
  it('should execute workflow initial part until manual step', async () => {

    const mockSystemPrompt = {
      role: 'system',
      parts: [{
        type: 'text',
        text: 'the system prompt',
      }],
    };

    const mockLlmResponse = {
      role: 'assistant',
      parts: [{
        type: 'text',
        text: 'the initial prompt response',
      }],
    };

    const builder = new WorkflowTestBuilder(createTestingModule, ChatWorkflow)
      .withToolMock(CreateDocument, [
        createDocumentResultMock(AiMessageDocument, mockSystemPrompt),
        createDocumentResultMock(AiMessageDocument, mockLlmResponse)
      ])
      .withToolMock(AiGenerateText, [{ data: mockLlmResponse }]);

    await builder.runWorkflow((workflow, test) => {
      // Should execute without errors and stop at waiting_for_user (before manual step)
      expect(workflow).toBeDefined();
      expect(workflow.state.place).toBe('waiting_for_user');
      expect(workflow.state.stop).toBe(true);
      expect(workflow.state.error).toBe(false);

      // Should call CreateDocument twice (greeting system message + llm response)
      expect(test.getToolSpy(CreateDocument)).toHaveBeenCalledTimes(2);

      // Should be called with system prompt first, then with LLM response
      expect(test.getToolSpy(CreateDocument)).toHaveBeenCalledWith(
        expect.objectContaining({ update: expect.objectContaining({
            meta: {
              hidden: true,
            },
            content: expect.objectContaining({ role: 'system' })
          })}),
        expect.anything(),
        expect.anything()
      );

      expect(test.getToolSpy(CreateDocument)).toHaveBeenCalledWith(
        expect.objectContaining({ update: {
            content: mockLlmResponse
          }}),
        expect.anything(),
        expect.anything()
      );

      // Should call AiGenerateText once
      expect(test.getToolSpy(AiGenerateText)).toHaveBeenCalledTimes(1);
      expect(test.getToolSpy(AiGenerateText)).toHaveBeenCalledWith(
        expect.objectContaining({
          llm: {
            provider: 'openai',
            model: 'gpt-4o',
          },
          messagesSearchTag: 'message',
        }),
        expect.anything(),
        expect.anything()
      );

      // Should have correct llmResponse from class property
      expect(workflow.llmResponse).toEqual(mockLlmResponse);

      // Verify the LLM result was stored correctly in workflow state
      expect(getToolResult(workflow, 'prompt', 'execute_prompt')).toMatchObject({
        data: mockLlmResponse,
      });

      // Check the history
      expect(workflow.state.history).toStrictEqual([
        { transition: 'invalidation', from: 'start', to: 'start' },
        { transition: 'greeting', from: 'start', to: 'ready' },
        { transition: 'prompt', from: 'ready', to: 'prompt_executed' },
        { transition: 'add_response', from: 'prompt_executed', to: 'waiting_for_user' },
      ])
    });

    await builder.teardown();
  });

  it('should execute workflow with user input until next manual step', async () => {

    const mockSystemPrompt = {
      role: 'system',
      parts: [{
        type: 'text',
        text: 'the system prompt',
      }],
    };

    const mockLlmResponse1 = {
      role: 'assistant',
      parts: [{
        type: 'text',
        text: 'the initial prompt response',
      }],
    };

    const mockUserMessage = {
      role: 'user',
      parts: [{
        type: 'text',
        text: 'the user input message',
      }],
    };

    const mockLlmResponse2 = {
      role: 'assistant',
      parts: [{
        type: 'text',
        text: 'the second prompt response',
      }],
    };

    const builder = new WorkflowTestBuilder(createTestingModule, ChatWorkflow)
      .withToolMock(CreateDocument, [
        createDocumentResultMock(AiMessageDocument, mockUserMessage),
        createDocumentResultMock(AiMessageDocument, mockLlmResponse2)
      ])
      .withToolMock(AiGenerateText, [{ data: mockLlmResponse2}])

      // mock existing documents created in previous workflow steps
      // to simulate state after first part of workflow (place = waiting_for_user)
      // add history as well to simulate full state
      .withWorkflowData({
        place: 'waiting_for_user',
        history: [
          { transition: 'invalidation', from: 'start', to: 'start' },
          { transition: 'greeting', from: 'start', to: 'ready' },
          { transition: 'prompt', from: 'ready', to: 'prompt_executed' },
          { transition: 'add_response', from: 'prompt_executed', to: 'waiting_for_user' },
        ],
        documents: [
          {
            blockName: AiMessageDocument.name,
            content: mockSystemPrompt,
          } as DocumentEntity,
          {
            blockName: AiMessageDocument.name,
            content: mockLlmResponse1,
          } as DocumentEntity,
        ]
      })

      // mock user input via context
      // set specific workflow id to match user payload with this workflow
      .withWorkflowId('123')
      .withContext({
        payload: {
          transition: {
            workflowId: '123',
            id: 'user_message',
            payload: 'the user input message',
          }
        }
      })
    ;

    await builder.runWorkflow((workflow, test) => {
      // Should execute without errors and stop at waiting_for_user again
      expect(workflow).toBeDefined();
      expect(workflow.state.place).toBe('waiting_for_user');
      expect(workflow.state.stop).toBe(true);
      expect(workflow.state.error).toBe(false);

      // Should call CreateDocument twice (user message + llm response 2)
      expect(test.getToolSpy(CreateDocument)).toHaveBeenCalledTimes(2);

      // Should be called with user message first, then with LLM response
      expect(test.getToolSpy(CreateDocument).mock.calls).toEqual([
        [
          expect.objectContaining({ update: expect.objectContaining({
              content: expect.objectContaining({ role: 'user' })
            })}),
          expect.anything(),
          expect.anything()
        ],
        [
          expect.objectContaining({ update: {
              content: mockLlmResponse2
            }}),
          expect.anything(),
          expect.anything()
        ],
      ]);

      // Should call AiGenerateText once (now with the context of user message)
      expect(test.getToolSpy(AiGenerateText)).toHaveBeenCalledTimes(1);
      expect(test.getToolSpy(AiGenerateText)).toHaveBeenCalledWith(
        expect.objectContaining({
          llm: {
            provider: 'openai',
            model: 'gpt-4o',
          },
          messagesSearchTag: 'message',
        }),
        expect.anything(),
        expect.anything()
      );

      // Should have correct latest llmResponse from class property
      expect(workflow.llmResponse).toEqual(mockLlmResponse2);

      // Verify the LLM result was stored correctly in workflow state
      expect(getToolResult(workflow, 'prompt', 'execute_prompt')).toMatchObject({
        data: mockLlmResponse2,
      });

      // All 4 messages are included in the workflow now
      expect(workflow.state.documents.length).toBe(4);
      expect(workflow.state.history).toStrictEqual([
        { transition: 'invalidation', from: 'start', to: 'start' },
        { transition: 'greeting', from: 'start', to: 'ready' },
        { transition: 'prompt', from: 'ready', to: 'prompt_executed' },
        { transition: 'add_response', from: 'prompt_executed', to: 'waiting_for_user' },
        { transition: 'user_message', from: 'waiting_for_user', to: 'ready' },
        { transition: 'prompt', from: 'ready', to: 'prompt_executed' },
        { transition: 'add_response', from: 'prompt_executed', to: 'waiting_for_user' },
      ])
    });

    await builder.teardown();
  });
});