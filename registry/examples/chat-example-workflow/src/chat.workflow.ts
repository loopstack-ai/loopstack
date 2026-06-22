import { z } from 'zod';
import { BaseWorkflow, Transition, type TransitionInput, Workflow } from '@loopstack/common';
import { LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';

/**
 * Chat example. Demonstrates two complementary ways messages enter the document store:
 *
 * 1. Manual saves — for messages this workflow constructs itself:
 *    - the hidden system prompt in `setup`
 *    - the user's text input in `userMessage`
 *
 * 2. Automatic save — `llmGenerateText.call()` persists the assistant's reply
 *    on its own, so `llmTurn` has nothing to do beyond making the call.
 *
 * Both kinds end up as `LlmMessageDocument` and form the conversation history
 * the LLM sees on the next turn.
 */
@Workflow({
  title: 'LLM Chat Example (Assistant Bob)',
  description:
    'An example workflow that demonstrates how to create a simple chat interface. Messages are processed by an LLM to generate responses.',
  widget: __dirname + '/chat.ui.yaml',
})
export class ChatWorkflow extends BaseWorkflow {
  constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
    super();
  }

  // Manual save (1/2): seed the conversation with a hidden system prompt.
  @Transition({ to: 'waiting_for_user' })
  async setup(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.documentStore.save(
      LlmMessageDocument,
      { role: 'user', text: this.render(__dirname + '/templates/systemMessage.md') },
      { meta: { hidden: true } },
    );
    return state;
  }

  // Manual save (2/2): persist what the user typed.
  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(state: Record<string, unknown>, input: TransitionInput<string>): Promise<Record<string, unknown>> {
    await this.documentStore.save(LlmMessageDocument, { role: 'user', text: input.data });
    return state;
  }

  // No manual save needed — the tool persists the assistant message itself.
  @Transition({ from: 'ready', to: 'waiting_for_user' })
  async llmTurn(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.llmGenerateText.call({}, { config: { provider: 'claude', model: 'claude-sonnet-4-6' } });
    return state;
  }
}
