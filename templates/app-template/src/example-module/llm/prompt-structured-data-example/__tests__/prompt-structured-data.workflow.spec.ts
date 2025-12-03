import {
  WorkflowTestBuilder,
  getToolResult,
  CreateDocument,
  createDocumentResultMock,
} from '@loopstack/core';
import { AiGenerateDocument } from '@loopstack/llm';
import { PromptStructuredDataWorkflow } from '../prompt-structured-data.workflow';
import { createTestingModule } from '../../../../../test/create-testing-module';
import { AiMessageDocument } from '@loopstack/core/dist/core-tools/documents/ai-message-document';
import { FileDocument } from '../documents/file-document';

describe('PromptStructuredDataWorkflow', () => {
  it('should execute workflow and generate hello world script', async () => {
    const mockStatusMessage = {
      role: 'assistant',
      parts: [{
        type: 'text',
        text: "Creating a 'Hello, World!' script in python...",
      }],
    };

    const mockFileContent = {
      description: 'hello_world.py',
      content: 'print("Hello, World!")',
    };

    const mockSuccessMessage = {
      role: 'assistant',
      parts: [{
        type: 'text',
        text: 'Successfully generated: hello_world.py',
      }],
    };

    const builder = new WorkflowTestBuilder(createTestingModule, PromptStructuredDataWorkflow)
      .withToolMock(CreateDocument, [
        createDocumentResultMock(AiMessageDocument, mockStatusMessage),
        createDocumentResultMock(AiMessageDocument, mockSuccessMessage),
      ])
      .withToolMock(AiGenerateDocument, [
        createDocumentResultMock(FileDocument, mockFileContent),
      ])
      .withArgs({ language: 'python' });

    await builder.runWorkflow((workflow, test) => {
      // Should execute without errors and reach end state
      expect(workflow).toBeDefined();
      expect(workflow.state.place).toBe('end');
      expect(workflow.state.stop).toBe(false);
      expect(workflow.state.error).toBe(false);

      // Should call CreateDocument twice (status message + success message)
      expect(test.getToolSpy(CreateDocument)).toHaveBeenCalledTimes(2);

      // Should call AiGenerateDocument once
      expect(test.getToolSpy(AiGenerateDocument)).toHaveBeenCalledTimes(1);
      expect(test.getToolSpy(AiGenerateDocument)).toHaveBeenCalledWith(
        expect.objectContaining({
          llm: {
            provider: 'openai',
            model: 'gpt-4o',
          },
          responseDocument: 'FileDocument',
          prompt: expect.stringContaining('python'),
        }),
        expect.anything(),
        expect.anything()
      );

      // Should have correct file from class property
      expect(workflow.file).toEqual(mockFileContent);

      // Verify the AiGenerateDocument result was stored correctly
      expect(getToolResult(workflow, 'prompt', 0)).toMatchObject({
        data: expect.objectContaining({
          content: mockFileContent,
        }),
      });

      // Check the history
      expect(workflow.state.history).toStrictEqual([
        { transition: 'invalidation', from: 'start', to: 'start' },
        { transition: 'greeting', from: 'start', to: 'ready' },
        { transition: 'prompt', from: 'ready', to: 'prompt_executed' },
        { transition: 'add_message', from: 'prompt_executed', to: 'end' },
      ]);
    });

    await builder.teardown();
  });
});