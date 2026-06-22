import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WorkflowProcessorService } from '@loopstack/core';
import { createContext, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { PromptInputChatWorkflow } from '../prompt-input-chat.workflow';

describe('PromptInputChatWorkflow', () => {
  let module: TestingModule;
  let workflow: PromptInputChatWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    module = await createWorkflowTest().forWorkflow(PromptInputChatWorkflow).compile();

    workflow = module.get(PromptInputChatWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('greets and stops at waiting_for_user', async () => {
    const result = await processor.process(workflow, {}, createStatelessContext());

    expect(result.hasError).toBe(false);
    expect(result.stop).toBe(true);
    expect(result.place).toBe('waiting_for_user');
    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentName: 'message',
          content: expect.objectContaining({ role: 'assistant' }),
        }),
      ]),
    );
  });

  it('echoes the user message and loops back to waiting_for_user', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000002';
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
          payload: { data: 'Hello there' },
        },
      },
    });

    const result = await processor.process(workflow, {}, context);

    expect(result.hasError).toBe(false);
    expect(result.place).toBe('waiting_for_user');
    const messages = (result.documents ?? []).filter((d) => d.documentName === 'message');
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ content: expect.objectContaining({ role: 'user', text: 'Hello there' }) }),
        expect.objectContaining({
          content: expect.objectContaining({ role: 'assistant', text: 'You said: Hello there' }),
        }),
      ]),
    );
  });
});
