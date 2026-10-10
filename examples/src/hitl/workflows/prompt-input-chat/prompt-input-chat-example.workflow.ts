import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
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
    // Same document type as every other chat turn: renders like one and, being tagged
    // 'message', joins the conversation history the provider builds below.
    await this.documentStore.save(LlmMessageDocument, {
      role: 'assistant',
      text: 'Hi! Ask me anything.',
    });
  }

  // Storing the message and generating the reply are separate transitions on purpose:
  // each transition commits its own transaction, so the user's message becomes visible
  // in the UI immediately — before the (slow) LLM turn even starts.
  @Transition({ from: 'waiting_for_user', to: 'generating_reply', wait: true, schema: z.string() })
  async userMessage(state: Record<string, unknown>, input: TransitionInput<string>) {
    // Tagged 'message', so it becomes part of the conversation history below
    await this.documentStore.save(LlmMessageDocument, { role: 'user', text: input.data });
  }

  @Transition({ from: 'generating_reply', to: 'waiting_for_user' })
  async generateReply() {
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
}
