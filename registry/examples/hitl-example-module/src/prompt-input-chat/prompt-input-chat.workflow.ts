import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { TransitionInput } from '@loopstack/common';

@Workflow({
  title: 'Prompt Input Chat',
  description:
    'Predefined-workflow HITL via the prompt-input widget. The workflow loops: it waits for a user ' +
    'message, echoes back a reply, and re-enters the waiting state. No LLM and no sub-workflow involved.',
  widget: __dirname + '/prompt-input-chat.workflow.yaml',
})
export class PromptInputChatWorkflow extends BaseWorkflow {
  @Transition({ to: 'waiting_for_user' })
  async greet(_state: Record<string, unknown>) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Hi! Send me a message and I will echo it back.',
    });
  }

  @Transition({ from: 'waiting_for_user', to: 'reply_sent', wait: true, schema: z.string() })
  async userMessage(state: Record<string, unknown>, input: TransitionInput<string>) {
    const payload = input.data;
    await this.documentStore.save(MessageDocument, { role: 'user', text: payload });
    await this.documentStore.save(MessageDocument, { role: 'assistant', text: `You said: ${payload}` });
  }

  @Transition({ from: 'reply_sent', to: 'waiting_for_user' })
  loop(_state: Record<string, unknown>) {}
}
