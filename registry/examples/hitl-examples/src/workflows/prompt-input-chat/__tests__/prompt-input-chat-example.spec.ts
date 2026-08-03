import { describe, expect, it } from 'vitest';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { queue, replay, runWorkflow } from '@loopstack/testing';
import { HitlExamplesModule } from '../../../hitl-examples.module';
import { PromptInputChatExampleWorkflow } from '../prompt-input-chat-example.workflow';

/** A scripted assistant reply in the shape `llm_generate_text` returns. */
const assistantReply = (text: string) => ({
  tool: 'llm_generate_text',
  envelope: {
    data: {
      message: {
        id: `msg_${text.length}`,
        role: 'assistant',
        text,
        blocks: [{ type: 'text', text }],
        stopReason: 'end_turn',
      },
      response: {},
    },
    metadata: { provider: 'claude', model: 'claude-sonnet-4-6' },
  },
});

describe('PromptInputChatExampleWorkflow', () => {
  it('drives two chat turns with queued messages and scripted LLM replies, then parks again', async () => {
    const run = await runWorkflow(PromptInputChatExampleWorkflow, undefined, {
      imports: [LlmProviderModule, HitlExamplesModule],
      answers: { userMessage: queue('What is Loopstack?', 'And what about pricing?') },
      replay: replay({
        version: 3,
        recordings: [assistantReply('Loopstack is a workflow framework.'), assistantReply('It is open source.')],
      }),
    });

    expect(run.error).toBeUndefined();
    // The chat loops back to waiting after each reply — two scripted turns, then parked again
    expect(run.status).toBe('waiting');
    expect(run.place).toBe('waiting_for_user');
    expect(run.path).toEqual(['greet', 'userMessage', 'loop', 'userMessage', 'loop']);

    // Both user messages became conversation documents. (The assistant replies are saved
    // inside the tool's handle(), which replay short-circuits — a documented boundary.)
    const texts = run.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts).toContain('What is Loopstack?');
    expect(texts).toContain('And what about pricing?');
  });

  it('parks on the greeting when no message is scripted', async () => {
    const run = await runWorkflow(PromptInputChatExampleWorkflow, undefined, {
      imports: [LlmProviderModule, HitlExamplesModule],
    });

    expect(run.status).toBe('waiting');
    expect(run.path).toEqual(['greet']);
    const texts = run.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts).toContain('Hi! Ask me anything.');
  });
});
