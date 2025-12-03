import {
  WorkflowTestBuilder,
  getToolResult,
  CreateDocument,
  createDocumentResultMock,
} from '@loopstack/core';
import { AiGenerateText } from '@loopstack/llm';
import { PromptWorkflow } from '../prompt.workflow';
import { createTestingModule } from '../../../../../test/create-testing-module';
import { AiMessageDocument } from '@loopstack/core/dist/core-tools/documents/ai-message-document';

describe('PromptWorkflow', () => {
  it('should execute workflow and generate haiku about a subject', async () => {
    const mockLlmResponse = {
      role: 'assistant',
      parts: [{
        type: 'text',
        text: 'Cherry blossoms fall\nPink petals dance in the wind\nSpring whispers goodbye',
      }],
    };

    const builder = new WorkflowTestBuilder(createTestingModule, PromptWorkflow)
      .withToolMock(AiGenerateText, [{ data: mockLlmResponse }])
      .withToolMock(CreateDocument, [
        createDocumentResultMock(AiMessageDocument, mockLlmResponse)
      ])
      .withArgs({ subject: 'spring' });

    await builder.runWorkflow((workflow, test) => {
      // Should execute without errors and reach end state
      expect(workflow).toBeDefined();
      expect(workflow.state.place).toBe('end');
      expect(workflow.state.stop).toBe(false);
      expect(workflow.state.error).toBe(false);

      // Should call AiGenerateText once with default subject "coffee"
      expect(test.getToolSpy(AiGenerateText)).toHaveBeenCalledTimes(1);
      expect(test.getToolSpy(AiGenerateText)).toHaveBeenCalledWith(
        expect.objectContaining({
          llm: {
            provider: 'openai',
            model: 'gpt-4o',
          },
          prompt: 'Write a haiku about spring',
        }),
        expect.anything(),
        expect.anything()
      );

      // Should have correct llmResponse from class property
      expect(workflow.llmResponse).toEqual(mockLlmResponse);

      // Verify the LLM result was stored correctly in workflow state
      expect(getToolResult(workflow, 'start', 'execute_prompt')).toMatchObject({
        data: mockLlmResponse,
      });

      // Should call CreateDocument once with the LLM response
      expect(test.getToolSpy(CreateDocument)).toHaveBeenCalledTimes(1);
      expect(test.getToolSpy(CreateDocument)).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {
            content: mockLlmResponse,
          },
        }),
        expect.anything(),
        expect.anything()
      );

      // Check the history
      expect(workflow.state.history).toStrictEqual([
        { transition: 'invalidation', from: 'start', to: 'start' },
        { transition: 'start', from: 'start', to: 'prompt_executed' },
        { transition: 'add_response', from: 'prompt_executed', to: 'end' },
      ]);
    });

    await builder.teardown();
  });

});