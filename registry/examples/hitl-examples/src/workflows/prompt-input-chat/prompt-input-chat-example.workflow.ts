import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { TransitionInput } from '@loopstack/common';
import { LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';

@Workflow({
  title: 'HITL - Prompt Input Chat Example',
  description:
    'Predefined-workflow HITL chat via the prompt-input widget. The workflow loops: it waits for a user ' +
    'message, generates an LLM reply from the full conversation history, and re-enters the waiting state.',
  widget: './prompt-input-chat-example.workflow.yaml',
})
export class PromptInputChatExampleWorkflow extends BaseWorkflow {
  constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
    super();
  }

  @Transition({ to: 'waiting_for_user' })
  async greet() {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Hi! Ask me anything.',
    });
  }

  @Transition({ from: 'waiting_for_user', to: 'reply_sent', wait: true, schema: z.string() })
  async userMessage(state: Record<string, unknown>, input: TransitionInput<string>) {
    // Tagged 'message', so it becomes part of the conversation history below
    await this.documentStore.save(LlmMessageDocument, { role: 'user', text: input.data });

    // No prompt/messages args: the provider builds the conversation from all
    // documents tagged 'message' and saves the assistant reply automatically
    await this.llmGenerateText.call(
      {},
      {
        config: {
          provider: 'claude',
          model: 'claude-sonnet-4-6',
          system: 'You are a friendly, concise chat assistant.',
        },
      },
    );
  }

  @Transition({ from: 'reply_sent', to: 'waiting_for_user' })
  loop() {}
}
